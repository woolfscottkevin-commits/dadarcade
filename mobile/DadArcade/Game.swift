import Foundation

struct Game: Codable, Identifiable, Hashable {
    let name: String
    let description: String
    let url: URL
    let genre: [String]
    let operatingSystem: String?
    let contentRating: String?

    var id: String { url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) }
    var hasOfflineCopy: Bool { ["mahjong", "mahjong/american", "balloon-uncle-bop"].contains(id) }
    var shareURL: URL { URL(string: "https://dadarcade.com/play/" + id)! }
    var playURL: URL {
        guard id == "balloon-uncle-bop" else { return url }
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "edition", value: "public")]
        return components.url!
    }
    var symbol: String {
        if id.hasPrefix("mahjong") { return "rectangle.stack.fill" }
        if id == "balloon-uncle-bop" { return "balloon.2.fill" }
        if genre.contains("Sports") { return "sportscourt.fill" }
        if genre.contains("Puzzle") { return "puzzlepiece.fill" }
        return "gamecontroller.fill"
    }
    var isAppReady: Bool {
        url.scheme == "https" && url.host == "dadarcade.com" && url.user == nil && url.port == nil &&
        !id.isEmpty && !url.pathComponents.contains("..") &&
        operatingSystem?.contains("iOS") == true && operatingSystem?.contains("iPadOS") == true &&
        contentRating == "4+"
    }
}

enum Catalog {
    static let url = URL(string: "https://dadarcade.com/games")!
    enum ParseError: Error { case invalidCatalog }

    // The existing website's structured game list is the single source of truth.
    // Only games explicitly marked as touch-ready and suitable for this release appear.
    static func parse(_ html: String) throws -> [Game] {
        struct Item: Decodable { let item: Game? }
        struct List: Decodable {
            let type: String
            let itemListElement: [Item]?
            enum CodingKeys: String, CodingKey { case type = "@type", itemListElement }
        }
        let regex = try NSRegularExpression(pattern: #"<script\b[^>]*type\s*=\s*["']application/ld\+json["'][^>]*>([\s\S]*?)</script\s*>"#, options: .caseInsensitive)
        for match in regex.matches(in: html, range: NSRange(html.startIndex..., in: html)) {
            guard let range = Range(match.range(at: 1), in: html),
                  let list = try? JSONDecoder().decode(List.self, from: Data(html[range].utf8)),
                  list.type == "ItemList", let items = list.itemListElement else { continue }
            var seen = Set<String>()
            let games = items.compactMap(\.item).filter { $0.isAppReady && seen.insert($0.id).inserted }
            guard !games.isEmpty else { throw ParseError.invalidCatalog }
            return games.sorted {
                let order = ["mahjong", "balloon-uncle-bop", "mahjong/american"]
                let a = order.firstIndex(of: $0.id) ?? 99
                let b = order.firstIndex(of: $1.id) ?? 99
                return a == b ? $0.name < $1.name : a < b
            }
        }
        throw ParseError.invalidCatalog
    }
}
