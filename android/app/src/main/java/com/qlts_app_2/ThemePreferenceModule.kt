package com.qlts_app_2

import android.app.UiModeManager
import android.content.Context
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

class ThemePreferenceModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun setPreference(preference: String) {
    if (preference !in VALID_PREFERENCES) return

    reactApplicationContext
        .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(PREFERENCE_KEY, preference)
        .apply()

    UiThreadUtil.runOnUiThread {
      applyPreference(reactApplicationContext, preference)
    }
  }

  companion object {
    const val NAME = "ThemePreference"
    const val PREFERENCES_NAME = "qlts_theme_preference"
    const val PREFERENCE_KEY = "preference"

    private val VALID_PREFERENCES = setOf("light", "dark", "system")

    fun applyStoredPreference(context: Context) {
      val preference =
          context
              .getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
              .getString(PREFERENCE_KEY, "system") ?: "system"

      applyPreference(context, preference)
    }

    private fun applyPreference(context: Context, preference: String) {
      val appCompatMode =
          when (preference) {
            "light" -> AppCompatDelegate.MODE_NIGHT_NO
            "dark" -> AppCompatDelegate.MODE_NIGHT_YES
            else -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
          }

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val uiModeManager = context.getSystemService(UiModeManager::class.java)
        val applicationMode =
            when (preference) {
              "light" -> UiModeManager.MODE_NIGHT_NO
              "dark" -> UiModeManager.MODE_NIGHT_YES
              else -> uiModeManager.nightMode
            }

        uiModeManager.setApplicationNightMode(applicationMode)
      } else {
        AppCompatDelegate.setDefaultNightMode(appCompatMode)
      }
    }
  }
}
