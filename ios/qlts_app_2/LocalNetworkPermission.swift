import Foundation
import Network
import React

@objc(LocalNetworkPermission)
final class LocalNetworkPermission: NSObject, NetServiceDelegate {
  private let policyDeniedErrorCode = Int32(-65570)

  private enum PermissionStatus: String {
    case granted
    case denied
    case unknown
  }

  private var browser: NWBrowser?
  private var netService: NetService?
  private var resolve: RCTPromiseResolveBlock?
  private var didFinish = false

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(requestAccess:rejecter:)
  func requestAccess(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.startProbe(resolve: resolve, reject: reject)
    }
  }

  @objc(checkAccess:rejecter:)
  func checkAccess(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      self.startProbe(resolve: resolve, reject: reject)
    }
  }

  private func startProbe(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    guard self.resolve == nil else {
      resolve(["status": PermissionStatus.unknown.rawValue])
      return
    }

    self.resolve = resolve
    self.didFinish = false

    let parameters = NWParameters()
    parameters.includePeerToPeer = true

    let browser = NWBrowser(
      for: .bonjour(type: "_http._tcp", domain: nil),
      using: parameters
    )

    browser.stateUpdateHandler = { [weak self] state in
      self?.handleBrowserState(state)
    }
    browser.browseResultsChangedHandler = { [weak self] _, _ in
      self?.finish(with: .granted)
    }

    let service = NetService(
      domain: "local.",
      type: "_http._tcp.",
      name: "qlts-app-\(UUID().uuidString)",
      port: 9
    )
    service.delegate = self

    self.browser = browser
    self.netService = service

    browser.start(queue: .main)
    service.publish(options: .listenForConnections)

    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
      self?.finish(with: .unknown)
    }
  }

  private func handleBrowserState(_ state: NWBrowser.State) {
    switch state {
    case .waiting(let error), .failed(let error):
      if isPolicyDenied(error) {
        finish(with: .denied)
      }
    default:
      break
    }
  }

  private func isPolicyDenied(_ error: NWError) -> Bool {
    switch error {
    case .dns(let dnsError):
      return Int32(dnsError) == policyDeniedErrorCode
    default:
      return false
    }
  }

  func netServiceDidPublish(_ sender: NetService) {
    // Publishing alone is not a reliable signal that Local Network access is
    // still granted after the user changes the permission in iOS Settings.
  }

  func netService(_ sender: NetService, didNotPublish errorDict: [String : NSNumber]) {
    let errorCode = errorDict[NetService.errorCode]?.int32Value
    if errorCode == policyDeniedErrorCode {
      finish(with: .denied)
      return
    }
    finish(with: .unknown)
  }

  private func finish(with status: PermissionStatus) {
    guard !didFinish else { return }
    didFinish = true

    browser?.cancel()
    browser = nil

    netService?.stop()
    netService = nil

    resolve?(["status": status.rawValue])
    resolve = nil
  }
}
