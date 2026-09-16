package com.qlts_app_2

import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * Ẩn/hiện status bar và navigation bar (taskbar trên máy tính bảng) cho các màn
 * xem camera toàn màn hình.
 *
 * `<StatusBar hidden>` của React Native chỉ ẩn được status bar và chỉ tác động
 * lên window của Activity, nên không đụng tới được navigation bar — trên điện
 * thoại thanh cử chỉ mảnh nên gần như không thấy, còn trên tablet taskbar chiếm
 * hẳn một dải che mất video.
 *
 * Lưu ý: lệnh ở đây áp lên window của Activity, KHÔNG áp được lên <Modal> của
 * React Native vì mỗi Modal là một Dialog có window riêng. Fullscreen camera vì
 * vậy phải dựng bằng overlay trong cùng cây React chứ không dùng Modal.
 */
class ImmersiveModeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  /**
   * Trạng thái JS đang yêu cầu. Cần giữ lại vì hệ thống trả system bar về mỗi
   * khi Activity mất focus (mở app khác, kéo thanh thông báo...) — lúc quay lại
   * phải tự áp lại chứ JS không hay biết để gọi lần nữa.
   */
  private var isEnabled = false

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun enable() {
    isEnabled = true
    apply(true)
  }

  @ReactMethod
  fun disable() {
    isEnabled = false
    apply(false)
  }

  private fun apply(hide: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return

    UiThreadUtil.runOnUiThread {
      val window = activity.window ?: return@runOnUiThread
      val controller = WindowInsetsControllerCompat(window, window.decorView)

      if (hide) {
        // App không chạy edge-to-edge (edgeToEdgeEnabled=false trong
        // gradle.properties), nghĩa là decor view vẫn chừa chỗ cho system bar.
        // Không tắt cờ này thì bar ẩn đi nhưng khoảng trống của nó vẫn còn.
        WindowCompat.setDecorFitsSystemWindows(window, false)
        // Sticky immersive: vuốt mép thì bar hiện đè lên nội dung rồi tự ẩn,
        // không đẩy layout nên video không bị giật khung.
        controller.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        controller.hide(WindowInsetsCompat.Type.statusBars())
        controller.hide(WindowInsetsCompat.Type.navigationBars())
      } else {
        controller.show(WindowInsetsCompat.Type.statusBars())
        controller.show(WindowInsetsCompat.Type.navigationBars())
        WindowCompat.setDecorFitsSystemWindows(window, true)
      }
    }
  }

  override fun onHostResume() {
    if (isEnabled) apply(true)
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    // Activity bị hủy: bỏ cờ để lần khởi động sau không kế thừa trạng thái ẩn.
    isEnabled = false
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    if (isEnabled) {
      isEnabled = false
      apply(false)
    }
    super.invalidate()
  }

  companion object {
    const val NAME = "ImmersiveMode"
  }
}
