import SwiftUI

@main
struct DadArcadeApp: App {
    @StateObject private var library = LibraryStore()
    var body: some Scene {
        WindowGroup {
            LibraryView()
                .environmentObject(library)
                .preferredColorScheme(.dark)
                .tint(Color.mint)
        }
    }
}
