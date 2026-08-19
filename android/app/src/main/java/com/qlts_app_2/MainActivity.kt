package com.qlts_app_2

import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.SystemClock
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  companion object {
    /**
     * Thời gian tối thiểu giữ splash screen, tính bằng ms. Nếu app khởi động
     * lâu hơn mức này thì splash tự tắt khi sẵn sàng, không cộng dồn thêm.
     * Giữ đồng bộ với splashHoldSeconds trong ios/qlts_app_2/AppDelegate.swift.
     */
    private const val SPLASH_MIN_DURATION_MS = 3000L

    /**
     * Trần cứng cho lượt chờ JS báo sẵn sàng. Mạng chết, API treo hay JS crash
     * thì splash vẫn phải nhường chỗ cho màn hình lỗi — không được khoá người
     * dùng ở màn splash vô thời hạn.
     */
    private const val SPLASH_MAX_DURATION_MS = 10000L

    /** Thời gian mờ dần khi gỡ splash. Khớp splashFadeSeconds bên iOS. */
    private const val SPLASH_FADE_MS = 250L
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "qlts_app_2"

  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()
    val splashStartedAt = SystemClock.uptimeMillis()
    // Dùng exit-animation listener chứ KHÔNG dùng setKeepOnScreenCondition:
    // điều kiện keep-on-screen chặn luôn cả pha dựng UI của React Native, nên
    // thời gian chờ sẽ bị cộng thêm vào thời gian khởi động (đo được 4.0s thay
    // vì 3.0s). Cách này để RN dựng song song, chỉ giữ lại phần view splash.
    SplashGate.reset()
    splashScreen.setOnExitAnimationListener { provider ->
      var hasDismissed = false

      val dismiss = {
        if (!hasDismissed) {
          hasDismissed = true
          val remaining = SPLASH_MIN_DURATION_MS - (SystemClock.uptimeMillis() - splashStartedAt)
          provider.view.postDelayed({
            provider.view.animate()
              .alpha(0f)
              .setDuration(SPLASH_FADE_MS)
              .withEndAction { provider.remove() }
              .start()
          }, remaining.coerceAtLeast(0L))
        }
      }

      // Gỡ khi JS báo màn hình đầu tiên đã có nội dung thật, chứ không phải khi
      // hết 3s: mốc thời gian cứng gỡ splash giữa lúc app còn đang bootstrap và
      // để lộ chuỗi vòng xoay. SPLASH_MIN_DURATION_MS giờ chỉ còn là sàn.
      SplashGate.awaitReady(dismiss)
      provider.view.postDelayed(dismiss, SPLASH_MAX_DURATION_MS)
    }
    requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    super.onCreate(savedInstanceState)
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
