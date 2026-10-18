import Foundation
import Combine

@MainActor
final class LibraryStore: ObservableObject {
    @Published private(set) var games: [Game] = []
    @Published private(set) var favorites: Set<String>
    @Published private(set) var recent: [String]
    @Published private(set) var isRefreshing = false
    @Published private(set) var status = "Your arcade, ready to play."
    private let defaults = UserDefaults.standard

    init() {
        favorites = Set(UserDefaults.standard.stringArray(forKey: "favorites") ?? [])
        recent = UserDefaults.standard.stringArray(forKey: "recent") ?? []
        if let data = defaults.data(forKey: "catalog"), let cached = try? JSONDecoder().decode([Game].self, from: data) {
            games = cached.filter(\.isAppReady)
        }
        if games.isEmpty, let url = Bundle.main.url(forResource: "catalog", withExtension: "html"),
           let html = try? String(contentsOf: url, encoding: .utf8), let bundled = try? Catalog.parse(html) {
            games = bundled
        }
    }

    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            var request = URLRequest(url: Catalog.url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
            request.setValue("DadArcade-iOS/1.0", forHTTPHeaderField: "User-Agent")
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let response = response as? HTTPURLResponse, response.statusCode == 200,
                  response.url?.host == "dadarcade.com", data.count < 2_000_000,
                  let html = String(data: data, encoding: .utf8) else { throw Catalog.ParseError.invalidCatalog }
            let updated = try Catalog.parse(html)
            games = updated
            defaults.set(try JSONEncoder().encode(updated), forKey: "catalog")
            status = "You’re up to date. New games arrive here."
        } catch {
            status = "Couldn’t refresh. Your saved arcade is ready."
        }
    }

    func toggleFavorite(_ game: Game) {
        if favorites.contains(game.id) { favorites.remove(game.id) } else { favorites.insert(game.id) }
        defaults.set(Array(favorites), forKey: "favorites")
    }

    func recordPlay(_ game: Game) {
        recent.removeAll { $0 == game.id }
        recent.insert(game.id, at: 0)
        recent = Array(recent.prefix(8))
        defaults.set(recent, forKey: "recent")
    }

    func clearLibraryHistory() {
        favorites = []; recent = []
        defaults.removeObject(forKey: "favorites")
        defaults.removeObject(forKey: "recent")
    }
}
