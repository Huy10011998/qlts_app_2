import UIKit
import React
import React_RCTAppDelegate

/// iOS 27 SDK bắt buộc app phải theo UIScene lifecycle — app nào còn dựng window
/// trực tiếp trong AppDelegate sẽ bị UIKit trap ngay khi scene đầu tiên nối vào
/// (__UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
/// Nên toàn bộ phần dựng window + khởi động React Native chuyển về đây.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "qlts_app_2",
      in: window,
      launchOptions: appDelegate.launchOptions
    )

    appDelegate.holdSplashScreen(on: window)
  }
}
