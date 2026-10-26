// facetrack.swift <video> [step] : prints "t y" every <step> s (default 0.5) - centre Y (0-1, top origin) of the LARGEST face, so a passer-by never steers the crop
import AVFoundation; import Vision
let a = AVURLAsset(url: URL(fileURLWithPath: CommandLine.arguments[1])); let g = AVAssetImageGenerator(asset: a); g.appliesPreferredTrackTransform = true
g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = .zero
let step = CommandLine.arguments.count > 2 ? Double(CommandLine.arguments[2])! : 0.5
let dur = CMTimeGetSeconds(a.duration); var t = 0.0
while t < dur { let ct = CMTime(seconds: t, preferredTimescale: 600)
  if let img = try? g.copyCGImage(at: ct, actualTime: nil) {
    let r = VNDetectFaceRectanglesRequest(); try? VNImageRequestHandler(cgImage: img).perform([r])
    if let f = r.results?.max(by: { $0.boundingBox.height < $1.boundingBox.height }) {
      print(String(format: "%.2f %.4f", t, 1 - f.boundingBox.midY)) } }
  t += step }
