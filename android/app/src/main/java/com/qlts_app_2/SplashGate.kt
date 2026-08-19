package com.qlts_app_2

import android.os.Handler
import android.os.Looper

/**
 * Cầu nối một chiều JS → splash: JS báo "app dựng xong rồi" để `MainActivity`
 * gỡ splash đúng lúc thay vì gỡ theo một mốc thời gian đoán trước.
 *
 * Trước đây splash gỡ cứng sau 3s. Trên iOS 3s là vừa đủ nên user thấy splash
 * rồi thấy luôn nội dung; trên Android chuỗi khởi động (Android Keystore lần
 * đầu + SQLite + permission + 2 API menu) thường lâu hơn, splash biến mất giữa
 * chừng và phơi ra hai vòng xoay nối đuôi nhau — vòng của RootNavigator rồi
 * vòng của Trang chủ.
 *
 * Object này giữ trạng thái ở tầng process chứ không phải tầng Activity: JS có
 * thể báo sẵn sàng trước hoặc sau khi `MainActivity` gắn listener, cả hai chiều
 * đều phải chạy đúng.
 */
object SplashGate {
  private val mainHandler = Handler(Looper.getMainLooper())

  private var isReady = false
  private var onReady: (() -> Unit)? = null

  /** JS gọi qua [SplashGateModule] khi màn hình đầu tiên đã có nội dung thật. */
  fun markReady() {
    mainHandler.post {
      if (isReady) return@post

      isReady = true
      onReady?.invoke()
      onReady = null
    }
  }

  /**
   * `MainActivity` đăng ký chỗ nhận tín hiệu. Gọi ngay nếu JS đã báo sẵn sàng
   * từ trước — nếu không thì lần khởi động nhanh bất thường sẽ treo splash.
   */
  fun awaitReady(callback: () -> Unit) {
    mainHandler.post {
      if (isReady) {
        callback()
        return@post
      }

      onReady = callback
    }
  }

  /**
   * Mỗi lần vào lại `onCreate` là một vòng đời splash mới (activity bị hệ thống
   * thu hồi rồi dựng lại) — trạng thái sẵn sàng của lần trước không còn đúng.
   */
  fun reset() {
    mainHandler.post {
      isReady = false
      onReady = null
    }
  }
}
