import SwiftUI

private let ink = Color(red: 0.055, green: 0.07, blue: 0.11)
private let panel = Color(red: 0.10, green: 0.12, blue: 0.18)

struct PlaySession: Identifiable {
    let id = UUID()
    let game: Game
    let offline: Bool
}

struct LibraryView: View {
    @EnvironmentObject private var library: LibraryStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var search = ""
    @State private var tab = 0
    @State private var selectedGame: Game?
    @State private var session: PlaySession?
    @State private var showParents = false

    var filtered: [Game] {
        library.games.filter { (tab != 1 || library.favorites.contains($0.id)) &&
            (search.isEmpty || $0.name.localizedCaseInsensitiveContains(search) || $0.genre.joined().localizedCaseInsensitiveContains(search)) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 26) {
                    if search.isEmpty && tab == 0 { hero }
                    if search.isEmpty && tab == 0 && !library.recent.isEmpty { recentGames }
                    HStack {
                        Text(tab == 1 ? "Your favorites" : "Pick your next adventure")
                            .font(.title2.bold())
                        Spacer()
                        Text("\(filtered.count) games").font(.caption).foregroundStyle(.secondary)
                    }
                    if filtered.isEmpty {
                        ContentUnavailableView(search.isEmpty ? "Save your favorites" : "No games found",
                            systemImage: search.isEmpty ? "heart" : "magnifyingglass",
                            description: Text(search.isEmpty ? "Tap a heart on a game to keep it here." : "Try another game name."))
                    }
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 285), spacing: 18)], spacing: 18) {
                        ForEach(filtered) { game in
                            GameCard(game: game, favorite: library.favorites.contains(game.id),
                                play: { selectedGame = game }, favoriteAction: { library.toggleFavorite(game) })
                        }
                    }
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.triangle.2.circlepath").foregroundStyle(.mint)
                        Text(library.status).font(.footnote).foregroundStyle(.secondary)
                        Spacer()
                        if library.isRefreshing { ProgressView() }
                    }.padding(.vertical, 8)
                }.padding(20).frame(maxWidth: 1100)
                    .frame(maxWidth: .infinity)
            }
            .background(ink)
            .navigationTitle("Dad Arcade")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showParents = true } label: { Image(systemName: "info.circle") }
                        .accessibilityLabel("About Dad Arcade")
                }
            }
            .searchable(text: $search, prompt: "Find a game")
            .safeAreaInset(edge: .bottom) {
                HStack(spacing: 12) {
                    tabButton("Arcade", image: "gamecontroller.fill", value: 0)
                    tabButton("Favorites", image: "heart.fill", value: 1)
                }.padding(.horizontal, 24).padding(.vertical, 10).background(.ultraThinMaterial)
            }
            .refreshable { await library.refresh() }
            .task { await library.refresh() }
            .onChange(of: scenePhase) { _, phase in
                if phase == .active { Task { await library.refresh() } }
            }
            .onOpenURL { openGameLink($0) }
            .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                if let url = activity.webpageURL { openGameLink(url) }
            }
            .sheet(item: $selectedGame) { game in
                GameDetail(game: game) { offline in
                    selectedGame = nil
                    library.recordPlay(game)
                    session = PlaySession(game: game, offline: offline)
                }.presentationDetents([.medium, .large])
            }
            .fullScreenCover(item: $session) { play in
                GamePlayer(session: play, allowedGames: library.games) { session = nil }
            }
            .sheet(isPresented: $showParents) { AboutView() }
        }
    }

    private func openGameLink(_ url: URL) {
        guard url.scheme == "https", url.host == "dadarcade.com" else { return }
        guard url.path.hasPrefix("/play/") else { return }
        let path = String(url.path.dropFirst(6)).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if let game = library.games.first(where: { $0.id == path }) { selectedGame = game }
        else {
            Task {
                await library.refresh()
                selectedGame = library.games.first(where: { $0.id == path })
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 14) {
            Label("A LITTLE PLAY. A LOT OF JOY.", systemImage: "sparkles")
                .font(.system(size: 11, weight: .bold, design: .monospaced)).tracking(1.8).foregroundStyle(.mint)
            Text("Good games.\nGreat company.").font(.system(size: 38, weight: .heavy, design: .rounded))
                .fixedSize(horizontal: false, vertical: true)
            Text("Made by Dad. Played by everyone.")
                .font(.subheadline).foregroundStyle(.white.opacity(0.7))
            HStack(spacing: 18) {
                Label("No ads", systemImage: "checkmark.shield")
                Label("No subscription", systemImage: "gift")
            }.font(.caption.weight(.medium)).foregroundStyle(.white.opacity(0.8))
        }.padding(26).frame(maxWidth: .infinity, alignment: .leading)
            .background(LinearGradient(colors: [Color(red: 0.14, green: 0.23, blue: 0.27), panel], startPoint: .topLeading, endPoint: .bottomTrailing))
            .clipShape(RoundedRectangle(cornerRadius: 26))
    }

    private var recentGames: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Play again").font(.headline)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack {
                    ForEach(library.recent.compactMap { id in library.games.first { $0.id == id } }) { game in
                        Button { selectedGame = game } label: {
                            Label(game.name, systemImage: game.symbol)
                                .font(.subheadline.weight(.semibold)).padding(14)
                                .background(panel, in: Capsule())
                        }.buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func tabButton(_ label: String, image: String, value: Int) -> some View {
        Button { tab = value } label: {
            Label(label, systemImage: image).font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity).padding(.vertical, 12)
                .foregroundStyle(tab == value ? ink : .white.opacity(0.65))
                .background(tab == value ? Color.mint : .clear, in: RoundedRectangle(cornerRadius: 14))
        }.buttonStyle(.plain).accessibilityAddTraits(tab == value ? .isSelected : [])
    }
}

struct GameCard: View {
    let game: Game
    let favorite: Bool
    let play: () -> Void
    let favoriteAction: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: play) {
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        GameArt(game: game).frame(width: 80, height: 80)
                        Spacer()
                        Image(systemName: "arrow.up.right").font(.title3).foregroundStyle(.white.opacity(0.45))
                    }
                    Text(game.name).font(.title2.bold()).foregroundStyle(.white)
                    Text(game.genre.joined(separator: " · ")).font(.subheadline).foregroundStyle(.white.opacity(0.6))
                }.frame(maxWidth: .infinity, alignment: .leading).padding(22)
                    .contentShape(Rectangle())
            }.buttonStyle(.plain).accessibilityLabel("Open \(game.name)")
            HStack {
                Label(game.hasOfflineCopy ? "Offline copy included" : "Play online", systemImage: game.hasOfflineCopy ? "arrow.down.circle.fill" : "wifi")
                    .font(.caption).foregroundStyle(.mint)
                Spacer()
                Button(action: favoriteAction) {
                    Image(systemName: favorite ? "heart.fill" : "heart").foregroundStyle(favorite ? .pink : .white.opacity(0.7))
                        .frame(width: 44, height: 44)
                }.accessibilityLabel("\(favorite ? "Unfavorite" : "Favorite") \(game.name)")
            }.padding(.leading, 22).padding(.trailing, 10).padding(.bottom, 8)
        }.background(panel, in: RoundedRectangle(cornerRadius: 24))
            .overlay(RoundedRectangle(cornerRadius: 24).stroke(.white.opacity(0.07)))
    }
}

struct GameArt: View {
    let game: Game
    var body: some View {
        if game.hasOfflineCopy {
            Image(game.id == "balloon-uncle-bop" ? "BalloonIcon" : "MahjongIcon")
                .resizable().scaledToFit().clipShape(RoundedRectangle(cornerRadius: 20))
        } else {
            Image(systemName: game.symbol).font(.system(size: 40)).foregroundStyle(.mint)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(.mint.opacity(0.12), in: RoundedRectangle(cornerRadius: 20))
        }
    }
}

struct GameDetail: View {
    let game: Game
    let play: (Bool) -> Void
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                GameArt(game: game).frame(width: 84, height: 84)
                Text(game.name).font(.largeTitle.bold())
                Text(game.description).foregroundStyle(.secondary)
                Text("Live games connect to DadArcade.com. Submitting a leaderboard score shares your initials and score publicly.")
                    .font(.caption).foregroundStyle(.secondary)
                Button { play(false) } label: {
                    Label("Play latest version", systemImage: "play.fill").frame(maxWidth: .infinity).padding(10)
                }.buttonStyle(.borderedProminent)
                if game.hasOfflineCopy {
                    Button { play(true) } label: {
                        Label("Play offline copy", systemImage: "arrow.down.circle").frame(maxWidth: .infinity).padding(8)
                    }.buttonStyle(.bordered)
                    Text("The offline copy works without internet. Its progress and scores stay separate from the live game.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                ShareLink(item: game.shareURL) { Label("Share this game", systemImage: "square.and.arrow.up") }
                    .padding(.top, 8)
            }.padding(28)
        }.background(ink).presentationDragIndicator(.visible)
    }
}

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var library: LibraryStore
    @State private var showReset = false
    @State private var showSupport = false
    var body: some View {
        NavigationStack {
            List {
                Section("Made for a little everyday fun") {
                    Text("Dad Arcade brings our games together on iPhone and iPad. New touch-ready games appear when Dad publishes them to the website’s catalog.")
                    Text("Mahjong Garden, American Mah Jongg, and Balloon Uncle Bop also have an offline copy included with this app.")
                }
                Section("Privacy") {
                    Text("Favorites and recent games are stored on this device. There are no ads, subscriptions, or app analytics. Known website analytics are blocked in the game player.")
                    Text("Live games connect to DadArcade.com. If you submit a score, your initials and score are sent to its public leaderboard. The server also receives normal connection information, including your IP address. Offline copies do not contact the website.")
                    Text("Game progress is saved on this device by each game. Deleting the app removes its local data. Public scores already submitted are not removed by deleting the app.")
                }
                Section("Help") {
                    Button("Report a problem or contact Dad Arcade") { showSupport = true }
                    Text("Use Report a Glitch on DadArcade.com and include the game name. You can also report inappropriate content there.").font(.caption)
                    Button("Clear favorites and recently played", role: .destructive) { showReset = true }
                }
                Section { Text("Dad Arcade · Version 1.0 (1)").foregroundStyle(.secondary) }
            }.navigationTitle("About & privacy")
                .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
                .confirmationDialog("Clear your arcade history? Game progress will be kept.", isPresented: $showReset, titleVisibility: .visible) {
                    Button("Clear history", role: .destructive) { library.clearLibraryHistory() }
                }
                .sheet(isPresented: $showSupport) { ParentLinkView(url: URL(string: "https://dadarcade.com/#feedback")!) }
        }
    }
}

struct ParentLinkView: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var answer = ""
    @State private var wrong = false
    @State private var first = Int.random(in: 23...48)
    @State private var second = Int.random(in: 14...39)
    var body: some View {
        NavigationStack {
            Form {
                Section("For a grown-up") {
                    Text("This opens a website outside Dad Arcade. Please ask a grown-up to continue.")
                    Text("What is \(first) + \(second)?").font(.title2.bold())
                    TextField("Answer", text: $answer).keyboardType(.numberPad)
                    if wrong { Text("Please try again.").foregroundStyle(.red) }
                    Button("Open website") {
                        if Int(answer) == first + second { openURL(url); dismiss() }
                        else { wrong = true; answer = "" }
                    }
                }
            }.navigationTitle("Open website")
                .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } } }
        }
    }
}
