package com.qlts_app_2

import android.app.Activity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.InstallStateUpdatedListener
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.InstallErrorCode
import com.google.android.play.core.install.model.InstallStatus
import com.google.android.play.core.install.model.UpdateAvailability
import com.google.android.play.core.install.InstallException

/**
 * Dò và tải bản cập nhật qua Google Play In-App Updates.
 *
 * Trước đây app lấy phiên bản Android bằng cách tải HTML trang Play Store rồi
 * dò regex. Google bỏ trường `softwareVersion` và đổi cấu trúc trang liên tục
 * nên không regex nào còn khớp — máy thật cài từ store luôn báo "Chưa thể kiểm
 * tra phiên bản trên Store". API chính thức này không phụ thuộc layout trang.
 *
 * Đổi lại, API chỉ cho biết CÓ bản mới kèm `availableVersionCode`, không trả về
 * versionName, nên phía JS không hiển thị được số phiên bản của bản mới.
 */
class AppUpdateModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

  private val appUpdateManager = AppUpdateManagerFactory.create(reactContext)

  /**
   * `AppUpdateInfo` của lần `checkForUpdate` gần nhất. `startUpdateFlow` bắt
   * buộc phải nhận đúng object này chứ không tự lấy lại được, nên phải giữ.
   */
  private var pendingUpdateInfo: AppUpdateInfo? = null

  private val installListener = InstallStateUpdatedListener { state ->
    when (state.installStatus()) {
      InstallStatus.DOWNLOADING -> {
        val payload = Arguments.createMap()
        // JS number là double: dung lượng APK không đủ lớn để mất chính xác.
        payload.putDouble("bytesDownloaded", state.bytesDownloaded().toDouble())
        payload.putDouble("totalBytesToDownload", state.totalBytesToDownload().toDouble())
        emit(EVENT_DOWNLOAD_PROGRESS, payload)
      }
      InstallStatus.DOWNLOADED -> emit(EVENT_DOWNLOADED, null)
      InstallStatus.FAILED -> {
        val payload = Arguments.createMap()
        payload.putInt("errorCode", state.installErrorCode())
        emit(EVENT_INSTALL_FAILED, payload)
      }
      else -> Unit
    }
  }

  init {
    reactContext.addLifecycleEventListener(this)
    appUpdateManager.registerListener(installListener)
  }

  override fun getName(): String = NAME

  /**
   * Trả về một trong ba trạng thái thay vì ném lỗi cho mọi thứ:
   * - "available": có bản mới trên Play.
   * - "upToDate": đang ở bản mới nhất.
   * - "unsupported": bản cài không đến từ Play (debug, sideload, máy không có
   *   Play Services). Đây KHÔNG phải lỗi — nếu reject thì màn Cài đặt lại hiện
   *   "Chưa thể kiểm tra phiên bản trên Store", đúng cái bug đang sửa.
   *
   * Chỉ reject khi thật sự không dò được (mất mạng, lỗi nội bộ của Play).
   */
  @ReactMethod
  fun checkForUpdate(promise: Promise) {
    appUpdateManager.appUpdateInfo
        .addOnSuccessListener { info ->
          pendingUpdateInfo = info

          val isAvailable =
              info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
                  info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)

          val result = Arguments.createMap()
          result.putString("status", if (isAvailable) STATUS_AVAILABLE else STATUS_UP_TO_DATE)
          result.putInt("installStatus", info.installStatus())
          if (isAvailable) {
            result.putInt("availableVersionCode", info.availableVersionCode())
          } else {
            result.putNull("availableVersionCode")
          }
          promise.resolve(result)
        }
        .addOnFailureListener { error ->
          pendingUpdateInfo = null

          if (isUnsupportedError(error)) {
            val result = Arguments.createMap()
            result.putString("status", STATUS_UNSUPPORTED)
            result.putNull("availableVersionCode")
            promise.resolve(result)
            return@addOnFailureListener
          }

          promise.reject(ERROR_CHECK_FAILED, error.message, error)
        }
  }

  /**
   * Mở luồng cập nhật mềm: Play dựng hộp thoại xin xác nhận, tải ngầm trong khi
   * người dùng vẫn dùng app, tải xong thì [installListener] bắn [EVENT_DOWNLOADED].
   *
   * Dùng `startUpdateFlow` (trả Task) thay cho `startUpdateFlowForResult` để
   * khỏi phải nối ActivityEventListener và tự quản requestCode.
   *
   * @return true nếu người dùng đồng ý, false nếu họ từ chối/thoát hộp thoại.
   */
  @ReactMethod
  fun startFlexibleUpdate(promise: Promise) {
    val info = pendingUpdateInfo
    if (info == null) {
      promise.reject(ERROR_NO_UPDATE_INFO, "Chưa dò cập nhật trước khi mở luồng cài đặt.")
      return
    }

    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject(ERROR_NO_ACTIVITY, "Không có Activity để mở hộp thoại cập nhật.")
      return
    }

    appUpdateManager
        .startUpdateFlow(
            info,
            activity,
            AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
        )
        .addOnSuccessListener { resultCode ->
          promise.resolve(resultCode == Activity.RESULT_OK)
        }
        .addOnFailureListener { error ->
          promise.reject(ERROR_START_FAILED, error.message, error)
        }
  }

  /** Khởi động lại app để cài bản đã tải xong. */
  @ReactMethod
  fun completeFlexibleUpdate() {
    appUpdateManager.completeUpdate()
  }

  /** Bắt buộc có để JS gắn/gỡ listener cho DeviceEventEmitter. */
  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Int) = Unit

  /**
   * Bản tải xong trong lúc app ở nền sẽ không bao giờ được cài nếu không nhắc
   * lại — [installListener] đã ngừng bắn từ lúc đó. Google yêu cầu kiểm tra lại
   * mỗi lần app quay lại foreground.
   */
  override fun onHostResume() {
    appUpdateManager.appUpdateInfo.addOnSuccessListener { info ->
      pendingUpdateInfo = info
      if (info.installStatus() == InstallStatus.DOWNLOADED) {
        emit(EVENT_DOWNLOADED, null)
      }
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() {
    pendingUpdateInfo = null
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    appUpdateManager.unregisterListener(installListener)
    pendingUpdateInfo = null
    super.invalidate()
  }

  private fun emit(eventName: String, payload: WritableMap?) {
    if (!reactApplicationContext.hasActiveReactInstance()) return

    reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, payload)
  }

  /** Bản không đến từ Play hoặc máy thiếu Play Services: không dò được là bình thường. */
  private fun isUnsupportedError(error: Exception): Boolean {
    val code = (error as? InstallException)?.errorCode ?: return false

    return code == InstallErrorCode.ERROR_APP_NOT_OWNED ||
        code == InstallErrorCode.ERROR_INSTALL_NOT_ALLOWED ||
        code == InstallErrorCode.ERROR_API_NOT_AVAILABLE ||
        code == InstallErrorCode.ERROR_PLAY_STORE_NOT_FOUND
  }

  companion object {
    const val NAME = "AppUpdate"

    const val STATUS_AVAILABLE = "available"
    const val STATUS_UP_TO_DATE = "upToDate"
    const val STATUS_UNSUPPORTED = "unsupported"

    const val EVENT_DOWNLOAD_PROGRESS = "AppUpdateDownloadProgress"
    const val EVENT_DOWNLOADED = "AppUpdateDownloaded"
    const val EVENT_INSTALL_FAILED = "AppUpdateInstallFailed"

    const val ERROR_CHECK_FAILED = "E_APP_UPDATE_CHECK_FAILED"
    const val ERROR_START_FAILED = "E_APP_UPDATE_START_FAILED"
    const val ERROR_NO_UPDATE_INFO = "E_APP_UPDATE_NO_INFO"
    const val ERROR_NO_ACTIVITY = "E_APP_UPDATE_NO_ACTIVITY"
  }
}
