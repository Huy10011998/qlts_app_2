import AppKit
import Foundation

// Tạo asset splash: vẽ logo nguồn vào một thẻ bo tròn 4 góc, phần ngoài thẻ
// để trong suốt. Dùng cho cả AppLogo.imageset (iOS) và drawable/splash_logo.png
// (Android) để hai nền tảng cùng một hình.
//
// Usage: create_rounded_splash_logo.swift <input> <output> <sizePx> [radiusPercent] [inset] [contentScale]
//   sizePx        cạnh canvas vuông, tính bằng pixel
//   radiusPercent bán kính bo góc theo tỉ lệ cạnh thẻ (mặc định 0.18)
//   inset         tỉ lệ cạnh thẻ so với canvas (mặc định 1.0 = phủ kín)
//   contentScale  tỉ lệ logo so với cạnh thẻ (mặc định 1.0); nhỏ hơn 1 sẽ nới
//                 thêm viền trắng quanh logo cho cân đối

let arguments = CommandLine.arguments
guard arguments.count >= 4, arguments.count <= 7 else {
    fputs("Usage: create_rounded_splash_logo.swift <input> <output> <sizePx> [radiusPercent] [inset] [contentScale]\n", stderr)
    exit(1)
}

let inputPath = arguments[1]
let outputPath = arguments[2]

guard let size = Int(arguments[3]), size > 0 else {
    fputs("sizePx must be a positive integer\n", stderr)
    exit(1)
}

let radiusPercent = arguments.count > 4 ? (Double(arguments[4]) ?? 0.18) : 0.18
let inset = arguments.count > 5 ? (Double(arguments[5]) ?? 1.0) : 1.0
let contentScale = arguments.count > 6 ? (Double(arguments[6]) ?? 1.0) : 1.0

guard radiusPercent >= 0, radiusPercent <= 0.5 else {
    fputs("radiusPercent must be between 0 and 0.5\n", stderr)
    exit(1)
}
guard inset > 0, inset <= 1.0 else {
    fputs("inset must be between 0 (exclusive) and 1\n", stderr)
    exit(1)
}
guard contentScale > 0, contentScale <= 1.0 else {
    fputs("contentScale must be between 0 (exclusive) and 1\n", stderr)
    exit(1)
}

guard
    let source = NSImage(contentsOfFile: inputPath),
    let sourceCG = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    fputs("Unable to read input image\n", stderr)
    exit(1)
}

guard let context = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Unable to create bitmap context\n", stderr)
    exit(1)
}

let canvas = CGFloat(size)
let cardSide = canvas * CGFloat(inset)
let card = CGRect(
    x: (canvas - cardSide) / 2,
    y: (canvas - cardSide) / 2,
    width: cardSide,
    height: cardSide
)
let radius = cardSide * CGFloat(radiusPercent)

// Logo được vẽ thu nhỏ theo contentScale; phần còn lại của thẻ tô trắng để
// viền trắng nối liền với nền trắng sẵn có trong ảnh nguồn.
let contentSide = cardSide * CGFloat(contentScale)
let content = CGRect(
    x: card.midX - contentSide / 2,
    y: card.midY - contentSide / 2,
    width: contentSide,
    height: contentSide
)

context.interpolationQuality = .high
context.saveGState()
context.addPath(CGPath(roundedRect: card, cornerWidth: radius, cornerHeight: radius, transform: nil))
context.clip()
context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
context.fill(card)
context.draw(sourceCG, in: content)
context.restoreGState()

guard
    let outputCG = context.makeImage(),
    let png = NSBitmapImageRep(cgImage: outputCG).representation(using: .png, properties: [:])
else {
    fputs("Unable to encode output PNG\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: outputPath), options: .atomic)
print("Created \(outputPath) (\(size)x\(size), radius \(Int(radiusPercent * 100))%, inset \(inset), content \(contentScale))")
