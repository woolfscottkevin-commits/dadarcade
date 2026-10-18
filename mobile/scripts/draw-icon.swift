import AppKit

let size = 1024
let colorSpace = CGColorSpaceCreateDeviceRGB()
let context = CGContext(data: nil, width: size, height: size, bitsPerComponent: 8, bytesPerRow: 0, space: colorSpace, bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CGColor { CGColor(red: r/255, green: g/255, blue: b/255, alpha: 1) }
let dark = color(16, 21, 33), mint = color(119, 238, 194), pink = color(255, 118, 154), gold = color(255, 205, 110)
context.setFillColor(dark); context.fill(CGRect(x: 0, y: 0, width: size, height: size))
let gradient = CGGradient(colorsSpace: colorSpace, colors: [color(31, 63, 69), dark] as CFArray, locations: [0, 1])!
context.drawLinearGradient(gradient, start: CGPoint(x: 200, y: 1024), end: CGPoint(x: 900, y: 0), options: [])
func round(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat, _ radius: CGFloat, _ fill: CGColor) {
    context.setFillColor(fill)
    context.addPath(CGPath(roundedRect: CGRect(x: x, y: y, width: w, height: h), cornerWidth: radius, cornerHeight: radius, transform: nil)); context.fillPath()
}
func circle(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ fill: CGColor) {
    context.setFillColor(fill); context.fillEllipse(in: CGRect(x: x-r, y: y-r, width: r*2, height: r*2))
}
round(225, 142, 574, 748, 65, mint)
round(251, 168, 522, 696, 43, color(31, 44, 57))
round(285, 743, 454, 85, 20, gold)
round(285, 394, 454, 312, 26, dark)
// A friendly pixel face lights up the cabinet.
round(354, 545, 65, 75, 12, mint)
round(605, 545, 65, 75, 12, mint)
round(416, 462, 192, 26, 8, mint)
round(390, 488, 26, 32, 8, mint)
round(608, 488, 26, 32, 8, mint)
round(285, 237, 454, 121, 24, color(49, 66, 82))
round(375, 280, 22, 85, 8, mint)
circle(386, 359, 33, pink)
circle(571, 296, 28, gold)
circle(665, 296, 28, pink)
round(445, 180, 134, 17, 8, dark)
round(117, 688, 22, 65, 5, gold); round(96, 710, 65, 22, 5, gold)
round(870, 430, 18, 53, 4, pink); round(853, 447, 53, 18, 4, pink)
if CommandLine.arguments.count > 2 && CommandLine.arguments[2] == "balloon" {
    context.setFillColor(color(50, 25, 82)); context.fill(CGRect(x: 0, y: 0, width: size, height: size))
    for (x, y, tint) in [(CGFloat(325), CGFloat(540), mint), (CGFloat(700), CGFloat(590), gold), (CGFloat(510), CGFloat(485), pink)] {
        context.setStrokeColor(tint); context.setLineWidth(10)
        context.move(to: CGPoint(x: x, y: y-190)); context.addCurve(to: CGPoint(x: x-25, y: 120), control1: CGPoint(x: x+100, y: 240), control2: CGPoint(x: x-110, y: 230)); context.strokePath()
        context.setFillColor(tint); context.fillEllipse(in: CGRect(x: x-153, y: y-190, width: 306, height: 380))
        circle(x-52, y+28, 30, color(255,255,255)); circle(x+52, y+28, 30, color(255,255,255))
        circle(x-49, y+24, 14, dark); circle(x+55, y+24, 14, dark)
        context.setStrokeColor(dark); context.setLineWidth(12); context.setLineCap(.round)
        context.move(to: CGPoint(x: x-52, y: y-35)); context.addQuadCurve(to: CGPoint(x: x+52, y: y-35), control: CGPoint(x: x, y: y-105)); context.strokePath()
    }
    circle(150, 800, 17, gold); circle(860, 290, 17, mint)
}
let bitmap = NSBitmapImageRep(cgImage: context.makeImage()!)
let output = URL(fileURLWithPath: CommandLine.arguments[1])
try bitmap.representation(using: .png, properties: [:])!.write(to: output)
