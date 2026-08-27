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
     * Thời gian giữ splash screen, tính bằng ms — cố định, đúng như iOS: JS báo
     * sẵn sàng sớm thì vẫn giữ đủ mốc này, JS treo thì cũng gỡ đúng mốc này chứ
     * không chờ thêm.
     * Giữ đồng bộ với splashHoldSeconds trong ios/qlts_app_2/AppDelegate.swift.
     */
    private const val SPLASH_DURATION_MS = 2000L

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
          provider.view.animate()
            .alpha(0f)
            .setDuration(SPLASH_FADE_MS)
            .withEndAction { provider.remove() }
            .start()
        }
      }

      val remaining = SPLASH_DURATION_MS - (SystemClock.uptimeMillis() - splashStartedAt)
      provider.view.postDelayed(dismiss, remaining.coerceAtLeast(0L))
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
