import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  /// Thời gian tối thiểu giữ splash screen. Nếu app khởi động lâu hơn mức này
  /// thì splash vẫn tắt đúng mốc, không cộng dồn thêm.
  /// Giữ đồng bộ với SPLASH_MIN_DURATION_MS trong MainActivity.kt.
  private let splashHoldSeconds: TimeInterval = 2
  private let splashFadeSeconds: TimeInterval = 0.25

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Firebase phải được configure TRƯỚC khi React Native khởi động, nếu không
    // native module @react-native-firebase/messaging sẽ không có default app và
    // mọi lời gọi getToken()/requestPermission() từ JS sẽ throw.
    // Guard nil để không configure 2 lần (configure lần 2 sẽ raise exception).
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }

    Orientation.setOrientation(.portrait)

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "qlts_app_2",
      in: window,
      launchOptions: launchOptions
    )

    holdSplashScreen()

    return true
  }

  /// iOS gỡ LaunchScreen.storyboard ngay khi window hiện lên, không có API nào
  /// giữ lại. Nên ta dựng lại chính storyboard đó thành một lớp phủ trên window
  /// rồi mờ dần gỡ xuống sau splashHoldSeconds — người dùng thấy liền mạch một
  /// màn splash duy nhất.
  private func holdSplashScreen() {
    guard
      let window = window,
      let launchViewController = UIStoryboard(name: "LaunchScreen", bundle: nil)
        .instantiateInitialViewController(),
      let overlay = launchViewController.view
    else {
      return
    }

    overlay.frame = window.bounds
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(overlay)
    window.bringSubviewToFront(overlay)

    DispatchQueue.main.asyncAfter(deadline: .now() + splashHoldSeconds) { [splashFadeSeconds] in
      UIView.animate(
        withDuration: splashFadeSeconds,
        animations: { overlay.alpha = 0 },
        completion: { _ in overlay.removeFromSuperview() }
      )
    }
  }

  func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    return Orientation.getOrientation()
  }
}

// 👇 THÊM LẠI ĐOẠN NÀY
class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
