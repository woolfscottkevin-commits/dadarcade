import SwiftUI
import WebKit

struct GamePlayer: View {
    let session: PlaySession
    let allowedGames: [Game]
    let close: () -> Void
    @StateObject private var browser = GameBrowser()
    @State private var askToClose = false
    @State private var askToReload = false
    @State private var externalURL: ExternalLink?
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.055, green: 0.07, blue: 0.11)
                BrowserView(browser: browser)
                if let error = browser.error {
                    VStack(spacing: 20) {
                        Image(systemName: "wifi.slash").font(.largeTitle).foregroundStyle(.mint)
                        Text("Let’s get you playing").font(.title2.bold())
                        Text(error).multilineTextAlignment(.center).foregroundStyle(.secondary)
                        Button("Try again") { browser.load(session.game, offline: browser.offline) }.buttonStyle(.borderedProminent)
                        if session.game.hasOfflineCopy && !browser.offline {
                            Button("Play offline copy") { browser.load(session.game, offline: true) }.buttonStyle(.bordered)
                        }
                        Button("Back to arcade", action: close)
                    }.padding(32).frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color(red: 0.055, green: 0.07, blue: 0.11))
                }
                if browser.loading { ProgressView("Opening game…").padding(20).background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16)) }
            }
            .navigationTitle(session.game.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { askToClose = true } label: { Label("Arcade", systemImage: "chevron.left") }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Restart game", systemImage: "arrow.clockwise") { askToReload = true }
                        Button("Report a problem", systemImage: "flag") { externalURL = ExternalLink(url: URL(string: "https://dadarcade.com/#feedback")!) }
                    } label: { Image(systemName: "ellipsis.circle") }.accessibilityLabel("Game options")
                }
            }
            .safeAreaInset(edge: .bottom, spacing: 0) {
                if browser.offline {
                    Text("OFFLINE COPY · SCORES STAY ON THIS DEVICE")
                        .font(.system(size: 9, weight: .semibold, design: .monospaced))
                        .tracking(0.7).foregroundStyle(.mint).frame(maxWidth: .infinity).padding(6)
                        .background(Color(red: 0.055, green: 0.07, blue: 0.11))
                }
            }
            .task {
                browser.onHome = { askToClose = true }
                browser.onExternal = { externalURL = ExternalLink(url: $0) }
                await browser.prepare(allowedGames: allowedGames)
                browser.load(session.game, offline: session.offline)
            }
            .onDisappear { browser.stop() }
            .onChange(of: scenePhase) { _, phase in browser.setActive(phase == .active) }
            .confirmationDialog("Return to the arcade? Unsaved game progress may be lost.", isPresented: $askToClose, titleVisibility: .visible) {
                Button("Return to arcade", role: .destructive, action: close)
            }
            .confirmationDialog("Restart this game? Unsaved progress may be lost.", isPresented: $askToReload, titleVisibility: .visible) {
                Button("Restart", role: .destructive) { browser.load(session.game, offline: browser.offline) }
            }
            .sheet(item: $externalURL) { ParentLinkView(url: $0.url) }
        }.interactiveDismissDisabled()
    }
}

private struct ExternalLink: Identifiable { let id = UUID(); let url: URL }

@MainActor
final class GameBrowser: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate {
    @Published var loading = true
    @Published var error: String?
    @Published var offline = false
    var webView: WKWebView!
    var onHome: (() -> Void)?
    var onExternal: ((URL) -> Void)?
    private var allowedPaths: Set<String> = []
    private var rulesReady = false
    private var timer: Task<Void, Never>?

    override init() {
        super.init()
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(OfflineGames(), forURLScheme: "arcade")
        config.allowsInlineMediaPlayback = true
        config.applicationNameForUserAgent = "DadArcadeApp/1.0"
        // The live games receive no native bridge or device permissions.
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        #if DEBUG
        webView.isInspectable = true
        #endif
    }

    func prepare(allowedGames: [Game]) async {
        allowedPaths = Set(allowedGames.map { $0.url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) })
        // WebKit content blockers accept a restricted regex syntax (no alternation).
        let domains = ["googletagmanager.com", "google-analytics.com", "analytics.google.com", "doubleclick.net"]
        let entries = domains.map { domain in
            ["trigger": ["url-filter": "^https?://[^/]*" + NSRegularExpression.escapedPattern(for: domain) + "/"], "action": ["type": "block"]]
        }
        do {
            let rules = String(data: try JSONSerialization.data(withJSONObject: entries), encoding: .utf8)!
            let list = try await WKContentRuleListStore.default().compileContentRuleList(forIdentifier: "DadArcadeNoAnalytics-v1", encodedContentRuleList: rules)
            if let list { webView.configuration.userContentController.add(list); rulesReady = true }
        } catch { rulesReady = false }
    }

    func load(_ game: Game, offline: Bool) {
        guard rulesReady else {
            loading = false; error = "The game player couldn’t start. Please reopen the app."
            return
        }
        timer?.cancel()
        self.offline = offline
        self.error = nil
        loading = true
        let url = offline ? URL(string: "arcade://bundled/\(game.id)/index.html?edition=public")! : game.playURL
        webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 20))
        timer = Task { [weak self] in
            try? await Task.sleep(for: .seconds(25))
            guard !Task.isCancelled, let self, self.loading else { return }
            self.webView.stopLoading()
            self.loading = false
            self.error = "The live game is taking too long to load. Check your connection or try an offline copy."
        }
    }

    func stop() {
        timer?.cancel()
        webView.stopLoading()
        webView.loadHTMLString("", baseURL: nil)
    }

    func setActive(_ active: Bool) {
        webView.setAllMediaPlaybackSuspended(!active)
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        timer?.cancel(); loading = false
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { failed(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { failed(error) }
    private func failed(_ failure: Error) {
        if (failure as NSError).code == NSURLErrorCancelled { return }
        timer?.cancel(); loading = false
        error = offline ? "The offline copy couldn’t open. Please try again." : "We couldn’t reach Dad Arcade. Check your connection, or use the included offline copy."
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loading = false; error = "The game closed to free up memory. You can reopen it below."
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if response.isForMainFrame, let http = response.response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            timer?.cancel(); loading = false; error = "This game is temporarily unavailable. Please try again or play the offline copy."
            decisionHandler(.cancel)
        } else { decisionHandler(.allow) }
    }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        // Subframes cannot be used to navigate to arbitrary sites or expose another app.
        if action.targetFrame?.isMainFrame == false { decisionHandler(.cancel); return }
        let path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
            .replacingOccurrences(of: "/index.html", with: "")
        let local = url.scheme == "arcade" && url.host == "bundled"
        let live = !offline && url.scheme == "https" && url.host == "dadarcade.com"
        if (local || live) && allowedPaths.contains(path) {
            if action.targetFrame == nil { webView.load(action.request); decisionHandler(.cancel) }
            else { decisionHandler(.allow) }
        } else if (local || live) && (path.isEmpty || path == "games") {
            onHome?(); decisionHandler(.cancel)
        } else {
            if action.navigationType == .linkActivated, ["https", "http"].contains(url.scheme ?? "") { onExternal?(url) }
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, requestMediaCapturePermissionFor origin: WKSecurityOrigin, initiatedByFrame frame: WKFrameInfo, type: WKMediaCaptureType, decisionHandler: @escaping (WKPermissionDecision) -> Void) { decisionHandler(.deny) }

    // Existing games use confirm() when leaving a board. Preserve those dialogs.
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        presentDialog(message: message, confirm: false) { _ in completionHandler() }
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        presentDialog(message: message, confirm: true, completion: completionHandler)
    }
    private func presentDialog(message: String, confirm: Bool, completion: @escaping (Bool) -> Void) {
        guard var controller = webView.window?.rootViewController else { completion(false); return }
        while let presented = controller.presentedViewController { controller = presented }
        let alert = UIAlertController(title: "Dad Arcade", message: message, preferredStyle: .alert)
        if confirm { alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completion(false) }) }
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completion(true) })
        controller.present(alert, animated: true)
    }
}

private struct BrowserView: UIViewRepresentable {
    let browser: GameBrowser
    func makeUIView(context: Context) -> WKWebView { browser.webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
