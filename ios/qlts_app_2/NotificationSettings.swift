import Foundation
import React
import UIKit

/**
 Mở thẳng trang Thông báo của app trong Cài đặt hệ thống.

 RN chỉ có `Linking.openSettings()` — nó luôn mở `app-settings:`, tức trang gốc
 của app, người dùng phải bấm thêm một nhịp vào dòng "Thông báo". Từ iOS 16
 Apple có hằng số công khai `openNotificationSettingsURLString` đi thẳng vào
 trang đó, nhưng RN không expose ra JS nên phải tự bắc cầu.
 */
@objc(NotificationSettings)
final class NotificationSettings: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  /// Resolve `true` nếu hệ thống thật sự mở được trang cài đặt, `false` nếu
  /// không — phía JS dựa vào đó để rơi về `Linking.openSettings()`.
  @objc(open:rejecter:)
  func open(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      let urlString: String
      if #available(iOS 16.0, *) {
        urlString = UIApplication.openNotificationSettingsURLString
      } else {
        // Máy cũ hơn chỉ tới được trang cài đặt app.
        urlString = UIApplication.openSettingsURLString
      }

      guard
        let url = URL(string: urlString),
        UIApplication.shared.canOpenURL(url)
      else {
        resolve(false)
        return
      }

      UIApplication.shared.open(url, options: [:]) { opened in
        resolve(opened)
      }
    }
  }
}
