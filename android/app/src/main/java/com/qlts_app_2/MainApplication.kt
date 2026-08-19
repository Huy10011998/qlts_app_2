package com.qlts_app_2

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import org.wonday.orientation.OrientationActivityLifecycle

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              add(ThemePreferencePackage())
              add(SplashGatePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    // Bắt buộc với react-native-orientation-locker trên Android. Lifecycle
    // callback giữ Activity hiện tại để các lệnh lockToPortrait/lockToLandscape
    // vẫn ép được hướng khi người dùng đang khóa tự xoay của thiết bị.
    registerActivityLifecycleCallbacks(OrientationActivityLifecycle.getInstance())
    ThemePreferenceModule.applyStoredPreference(this)
    loadReactNative(this)
  }
}
