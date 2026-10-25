// facey.swift <video> : prints the median face-box center Y (0-1, top origin) and height over ~20 sampled frames
import AVFoundation; import Vision
let a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1])); let g = AVAssetImageGenerator(asset: a); g.appliesPreferredTrackTransform = true
let dur = CMTimeGetSeconds(a.duration); var ys = [Double](), hs = [Double]()
for i in 0..<20 { let t = CMTime(seconds: dur * Double(i) / 20 + 0.1, preferredTimescale: 600)
  guard let img = try? g.copyCGImage(at: t, actualTime: nil) else { continue }
  let r = VNDetectFaceRectanglesRequest(); try? VNImageRequestHandler(cgImage: img).perform([r])
  guard let fs = r.results, !fs.isEmpty else { continue }
  let minY = fs.map { 1 - $0.boundingBox.maxY }.min()!, maxY = fs.map { 1 - $0.boundingBox.minY }.max()!
  ys.append((minY + maxY) / 2); hs.append(maxY - minY) }
ys.sort(); hs.sort(); if ys.isEmpty { print("none") } else { print(ys[ys.count/2], hs[hs.count/2]) }
