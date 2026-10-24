package com.qlts_app_2

import android.content.pm.PackageManager
import android.os.Build
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil

/**
 * Hộp hỏi vân tay / khuôn mặt / khoá màn hình của hệ thống, dùng làm cổng mở app.
 *
 * Không đi qua react-native-keychain: keychain gắn khoá Keystore với sinh trắc,
 * mà Keystore chỉ nhận sinh trắc Class 3 (BIOMETRIC_STRONG). Khuôn mặt bằng camera
 * thường — Samsung S23/S24, Oppo, Xiaomi… — chỉ là Class 2, nên muốn dùng được
 * phải hỏi mức BIOMETRIC_WEAK và không kèm CryptoObject. Token vốn không gắn
 * sinh trắc (xem biometric.ts) nên đổi sang đây không mất gì.
 *
 * Không kèm CryptoObject thì lần nào hệ thống cũng hiện hộp hỏi, không có
 * chuyện khoá tự qua trong vài giây sau khi vừa mở máy như khoá Keystore.
 */
class BiometricGateModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  /**
   * Sinh trắc đã cài và dùng được: "fingerprint", "face", "fingerprint-face",
   * hoặc `null` khi máy không có hay chưa cài.
   *
   * Android không cho biết người dùng đã cài vân tay hay khuôn mặt, chỉ biết
   * mức cao nhất đang có. Máy có cả hai cảm biến mà không qua được mức STRONG
   * thì chỉ có khuôn mặt Class 2 (vân tay luôn là Class 3), còn qua được thì
   * không phân biệt được nên trả "fingerprint-face".
   */
  @ReactMethod
  fun getBiometricKind(promise: Promise) {
    try {
      val manager = BiometricManager.from(reactApplicationContext)
      if (manager.canAuthenticate(BIOMETRIC_WEAK) != BiometricManager.BIOMETRIC_SUCCESS) {
        promise.resolve(null)
        return
      }
      val packageManager = reactApplicationContext.packageManager
      val hasFingerprint = packageManager.hasSystemFeature(PackageManager.FEATURE_FINGERPRINT)
      val hasFace =
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
              (packageManager.hasSystemFeature(PackageManager.FEATURE_FACE) ||
                  packageManager.hasSystemFeature(PackageManager.FEATURE_IRIS))
      val kind =
          when {
            hasFingerprint && hasFace ->
                if (manager.canAuthenticate(BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS) {
                  "fingerprint-face"
                } else {
                  "face"
                }
            hasFace -> "face"
            else -> "fingerprint"
          }
      promise.resolve(kind)
    } catch (e: Exception) {
      promise.resolve(null)
    }
  }

  /**
   * Hiện hộp hỏi. `biometric` nhận vân tay / khuôn mặt, `deviceLock` nhận mẫu
   * hình / mã PIN / mật khẩu máy (chỉ Android 11+, JS đã chặn). Qua thì resolve
   * `true`; lỗi thì reject với message dạng "code: 13, msg: …" giống keychain để
   * `classifyBiometricError` đọc được mã.
   */
  @ReactMethod
  fun authenticate(options: ReadableMap, promise: Promise) {
    val activity = reactApplicationContext.currentActivity as? FragmentActivity
    if (activity == null) {
      promise.reject(E_AUTHENTICATE, "code: $ERROR_CANCELED, msg: no activity")
      return
    }
    val allowBiometric = options.hasKey("biometric") && options.getBoolean("biometric")
    val allowDeviceLock = options.hasKey("deviceLock") && options.getBoolean("deviceLock")

    val promptInfo =
        try {
          var authenticators = 0
          if (allowBiometric) authenticators = authenticators or BIOMETRIC_WEAK
          if (allowDeviceLock) authenticators = authenticators or DEVICE_CREDENTIAL
          BiometricPrompt.PromptInfo.Builder()
              .setTitle(options.getString("title") ?: "")
              .apply {
                options.getString("subtitle")?.let { setSubtitle(it) }
                options.getString("description")?.let { setDescription(it) }
                // Có khoá màn hình thì hệ thống tự thêm nút "Dùng mẫu hình / mã
                // PIN", không được đặt nút phụ.
                if (!allowDeviceLock) setNegativeButtonText(options.getString("cancel") ?: "Huỷ")
              }
              .setAllowedAuthenticators(authenticators)
              // Khuôn mặt nhận xong thì vào luôn, không bắt bấm thêm "Xác nhận".
              .setConfirmationRequired(false)
              .build()
        } catch (e: Exception) {
          promise.reject(E_AUTHENTICATE, e.message, e)
          return
        }

    UiThreadUtil.runOnUiThread {
      try {
        val prompt =
            BiometricPrompt(
                activity,
                ContextCompat.getMainExecutor(activity),
                object : BiometricPrompt.AuthenticationCallback() {
                  override fun onAuthenticationSucceeded(
                      result: BiometricPrompt.AuthenticationResult,
                  ) {
                    promise.resolve(true)
                  }

                  override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    promise.reject(E_AUTHENTICATE, "code: $errorCode, msg: $errString")
                  }

                  // Chạm sai một lần: hộp hỏi vẫn mở cho thử lại, chưa trả gì.
                },
            )
        prompt.authenticate(promptInfo)
      } catch (e: Exception) {
        promise.reject(E_AUTHENTICATE, e.message, e)
      }
    }
  }

  companion object {
    const val NAME = "BiometricGate"
    private const val E_AUTHENTICATE = "E_BIOMETRIC_AUTHENTICATE"
    private const val ERROR_CANCELED = BiometricPrompt.ERROR_CANCELED
  }
}
