import Foundation
import WebKit
import UniformTypeIdentifiers

// Serves only bundled resources. A custom scheme preserves the website's root-relative
// asset URLs without exposing the app's documents or giving games a native API bridge.
final class OfflineGames: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, url.host == "bundled",
              let root = Bundle.main.resourceURL?.appendingPathComponent("Offline") else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        var path = url.path
        if !(path.split(separator: "/").last?.contains(".") ?? false) { path += "/index.html" }
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.path + "/"),
              let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        task.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: mime.hasPrefix("text/") || mime.contains("javascript") ? "utf-8" : nil))
        task.didReceive(data)
        task.didFinish()
    }
    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
