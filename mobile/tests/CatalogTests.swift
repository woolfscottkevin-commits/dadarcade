import Foundation

@main struct CatalogTests {
    static func main() throws {
        let root = URL(fileURLWithPath: CommandLine.arguments[1])
        let html = try String(contentsOf: root.appendingPathComponent("games/index.html"), encoding: .utf8)
        let games = try Catalog.parse(html)
        precondition(games.map(\.id) == ["mahjong", "balloon-uncle-bop", "mahjong/american"])
        precondition(games[1].playURL.query == "edition=public")
        precondition(games[1].shareURL.absoluteString == "https://dadarcade.com/play/balloon-uncle-bop")
        precondition(games[2].shareURL.absoluteString == "https://dadarcade.com/play/mahjong/american")
        precondition(games.allSatisfy(\.hasOfflineCopy))

        let item = #"{"@type":"VideoGame","name":"Future Game","description":"A newly published touch game","url":"https://dadarcade.com/future-game","genre":["Puzzle"],"operatingSystem":"iOS, iPadOS, Web","contentRating":"4+"}"#
        func catalog(_ json: String) -> String { "<script type='application/ld+json'>{\"@type\":\"ItemList\",\"itemListElement\":[{\"item\":\(json)}]}</script>" }
        let fresh = try Catalog.parse(catalog(item))
        precondition(fresh.first?.id == "future-game", "New published games must not require an app allowlist update")
        precondition(fresh.first?.hasOfflineCopy == false)
        for invalid in [item.replacingOccurrences(of: "https://dadarcade.com/", with: "https://dadarcade.com.evil.example/"),
                        item.replacingOccurrences(of: "https://", with: "http://"),
                        item.replacingOccurrences(of: "4+", with: "17+"),
                        item.replacingOccurrences(of: "iOS, iPadOS, Web", with: "Web"),
                        item.replacingOccurrences(of: "https://dadarcade.com/", with: "https://attacker@dadarcade.com/")] {
            do { _ = try Catalog.parse(catalog(invalid)); fatalError("Unsafe or unreviewed catalog entry accepted") }
            catch Catalog.ParseError.invalidCatalog { }
        }
        print("Catalog: current games, automatic discovery, public edition, age/device gating, and URL validation passed.")
    }
}
