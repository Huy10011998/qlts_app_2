import AppKit
import Foundation

let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    fputs("Usage: create_android_splash_logo.swift <input> <output>\n", stderr)
    exit(1)
}

guard
    let source = NSImage(contentsOfFile: arguments[1]),
    let sourceCG = source.cgImage(forProposedRect: nil, context: nil, hints: nil)
else {
    fputs("Unable to read input image\n", stderr)
    exit(1)
}

let width = sourceCG.width
let height = sourceCG.height
let bytesPerPixel = 4
let bytesPerRow = width * bytesPerPixel
var pixels = [UInt8](repeating: 0, count: height * bytesPerRow)

guard let context = CGContext(
    data: &pixels,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: bytesPerRow,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Unable to create bitmap context\n", stderr)
    exit(1)
}

context.draw(sourceCG, in: CGRect(x: 0, y: 0, width: width, height: height))

func isBackgroundWhite(_ index: Int) -> Bool {
    let red = Int(pixels[index])
    let green = Int(pixels[index + 1])
    let blue = Int(pixels[index + 2])
    let alpha = Int(pixels[index + 3])
    return alpha > 0 && min(red, green, blue) >= 210 &&
        max(red, green, blue) - min(red, green, blue) <= 28
}

func pixelIndex(x: Int, y: Int) -> Int {
    y * bytesPerRow + x * bytesPerPixel
}

var visited = [Bool](repeating: false, count: width * height)
var queue: [(Int, Int)] = []
var queuePosition = 0

// Seed only near-white pixels touching transparent space. This removes the
// connected white backing while preserving white lettering inside the red mark.
for y in 0..<height {
    for x in 0..<width {
        let index = pixelIndex(x: x, y: y)
        guard isBackgroundWhite(index) else { continue }

        let neighbours = [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)]
        let touchesTransparency = neighbours.contains { nx, ny in
            guard nx >= 0, nx < width, ny >= 0, ny < height else { return true }
            return pixels[pixelIndex(x: nx, y: ny) + 3] == 0
        }
        guard touchesTransparency else { continue }

        visited[y * width + x] = true
        queue.append((x, y))
    }
}

while queuePosition < queue.count {
    let (x, y) = queue[queuePosition]
    queuePosition += 1

    for (nx, ny) in [(x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)] {
        guard nx >= 0, nx < width, ny >= 0, ny < height else { continue }
        let visitedIndex = ny * width + nx
        let index = pixelIndex(x: nx, y: ny)
        guard !visited[visitedIndex], isBackgroundWhite(index) else { continue }
        visited[visitedIndex] = true
        queue.append((nx, ny))
    }
}

for (x, y) in queue {
    let index = pixelIndex(x: x, y: y)
    pixels[index] = 0
    pixels[index + 1] = 0
    pixels[index + 2] = 0
    pixels[index + 3] = 0
}

guard let cutoutCG = context.makeImage() else {
    fputs("Unable to create cutout image\n", stderr)
    exit(1)
}

// Match the apparent iOS LaunchScreen logo width. Android's system splash
// displays the previous cutout about 25% larger relative to screen width.
let androidScale = 0.8
guard let outputContext = CGContext(
    data: nil,
    width: width,
    height: height,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    fputs("Unable to create output bitmap context\n", stderr)
    exit(1)
}

let scaledWidth = CGFloat(width) * androidScale
let scaledHeight = CGFloat(height) * androidScale
let destination = CGRect(
    x: (CGFloat(width) - scaledWidth) / 2,
    y: (CGFloat(height) - scaledHeight) / 2,
    width: scaledWidth,
    height: scaledHeight
)
outputContext.interpolationQuality = .high
outputContext.draw(cutoutCG, in: destination)

guard
    let outputCG = outputContext.makeImage(),
    let png = NSBitmapImageRep(cgImage: outputCG).representation(using: .png, properties: [:])
else {
    fputs("Unable to encode output PNG\n", stderr)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: arguments[2]), options: .atomic)
print("Created \(arguments[2]) (\(width)x\(height), scale \(androidScale)); removed \(queue.count) background pixels")
