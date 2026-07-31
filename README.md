This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.

---

# Push Notification — Contract với Backend

App đã hoàn thiện toàn bộ phía client (native + JS). Phần này là những gì BE cần
biết để "gửi là chạy". Code nằm ở [src/services/notifications/](src/services/notifications/).

Firebase project: **qlts-2fe12** (sender id `658864459072`) — dùng chung cho cả 2 app:

| Nền tảng | App id / bundle |
|---|---|
| Android | `com.qlts_app_2` |
| iOS | `com.cholimexfood.appqlts2.1` |

---

## 1. Bật phần gọi API (việc cần làm khi BE xong)

Trong [src/config/api.tsx](src/config/api.tsx):

1. Sửa 2 endpoint cho đúng path thật:
   - `REGISTER_DEVICE_TOKEN`
   - `UNREGISTER_DEVICE_TOKEN`
2. Đổi `PUSH_NOTIFICATION_API_READY` thành `true`.

Trước khi bật, app vẫn xin quyền / lấy FCM token / hiển thị / điều hướng bình
thường — chỉ bỏ qua bước gửi token lên server và ghi log, nên không bị spam lỗi 404.

---

## 2. Endpoint app sẽ gọi

Cả hai đều là `POST`, có `Authorization: Bearer <accessToken>` (tự động thêm bởi
`callApi`), nên BE lấy user từ token.

### Đăng ký token — gọi sau khi đăng nhập thành công

```json
{
  "token": "<FCM registration token>",
  "platform": "android",
  "deviceId": "a1b2c3…",
  "deviceName": "SM-A546E",
  "osVersion": "14",
  "appVersion": "2.28",
  "buildNumber": "53"
}
```

App chỉ gọi lại khi `token`, `appVersion` hoặc `buildNumber` thay đổi (có cache
local), nên BE cứ xử lý upsert theo `(userId, token)`.

### Huỷ đăng ký — gọi khi logout

```json
{ "token": "<FCM registration token>" }
```

Sau khi nhận, BE phải ngừng gửi thông báo của user đó tới token này — quan trọng
với thiết bị dùng chung. App **không** xoá FCM token nên token vẫn hợp lệ cho user
đăng nhập tiếp theo.

---

## 3. Payload BE gửi qua FCM

`data` của FCM **chỉ nhận string → string**. Field lồng nhau phải JSON.stringify
(xem `params`).

### ⚠️ Quy tắc bắt buộc: luôn gửi khối `notification`

Mọi thông báo user cần thấy **phải** có khối `notification`. Đây không phải khuyến
nghị mà là giới hạn của nền tảng:

- **iOS**: khi user swipe tắt app, push chỉ có `content-available: 1` (không có
  `alert`) **không được gửi tới máy** — iOS không đánh thức app đã bị force-quit.
  Kết quả: user không thấy thông báo nào.
- **iOS**: khi app ở background, silent push bị iOS throttle và giao best-effort,
  không đảm bảo thời gian.
- **Android**: data-only chạy được cả khi app bị kill, nhưng máy Xiaomi / Oppo /
  Vivo / Huawei có battery manager hung hãn vẫn có thể chặn headless start.

Có khối `notification` thì OS tự dựng thông báo mà **không cần JS chạy** → đáng tin
cậy ở mọi trạng thái, trên cả 2 nền tảng.

Data-only (mục kế tiếp) chỉ dùng cho **đồng bộ dữ liệu ngầm** khi không cần user
thấy gì, hoặc cho thông báo Android-only.

### Dạng chuẩn: có `notification` + `data`

```json
{
  "message": {
    "token": "<device token>",
    "notification": {
      "title": "Phiếu xuất kho cần duyệt",
      "body": "PX-2026-0731 đang chờ bạn phê duyệt"
    },
    "data": {
      "type": "asset",
      "route": "AssetDetails",
      "params": "{\"id\":4821,\"titleHeader\":\"PX-2026-0731\"}",
      "channelId": "urgent",
      "notificationId": "px-4821-approve"
    },
    "android": { "priority": "high" },
    "apns": {
      "headers": { "apns-priority": "10" },
      "payload": { "aps": { "sound": "default", "badge": 1 } }
    }
  }
}
```

### Dạng data-only — chỉ cho đồng bộ ngầm, KHÔNG dùng cho thông báo iOS

Bỏ khối `notification`, đưa `title`/`body` vào `data`. iOS **bắt buộc** thêm
`"content-available": 1` để app được đánh thức — nhưng đọc lại cảnh báo ở trên:
không hoạt động khi user đã swipe tắt app trên iOS.

```json
{
  "message": {
    "token": "<device token>",
    "data": {
      "title": "Cảnh báo camera",
      "body": "Mất kết nối camera Kho A",
      "route": "Camera",
      "channelId": "urgent",
      "notificationId": "cam-A-offline"
    },
    "android": { "priority": "high" },
    "apns": {
      "headers": { "apns-priority": "5" },
      "payload": { "aps": { "content-available": 1 } }
    }
  }
}
```

### Bảng field trong `data`

| Field | Bắt buộc | Ý nghĩa |
|---|---|---|
| `notificationId` | Nên có | Id ổn định do BE sinh. App dùng để chống hiển thị/điều hướng trùng. Thiếu thì fallback sang `messageId` của FCM. |
| `route` | Không | Tên màn hình mở khi user bấm. Phải nằm trong whitelist (mục 4). Thiếu/sai → chỉ mở app, không crash. |
| `params` | Không | Params của route, **dạng JSON string**. JSON sai → bỏ qua params, vẫn mở được route. |
| `channelId` | Không | `default` \| `urgent` \| `silent`. Mặc định `default`. Alias lạ → `default`. |
| `type` | Không | Nhãn phân loại nghiệp vụ, app không xử lý, để dành cho báo cáo/thống kê. |
| `title`, `body` | Chỉ khi data-only | Nội dung thông báo. |

Field lạ khác vẫn được giữ nguyên và truyền tới màn hình đích.

---

## 4. Whitelist `route`

App cố tình chỉ nhận route trong danh sách này (xem
[pushRoutes.ts](src/services/notifications/pushRoutes.ts)) — route sai chính tả từ
BE sẽ chỉ mở app thay vì làm crash navigation.

**Root stack:** `CameraPlayback`, `VehicleJourneyMap`, `VehicleTrackingMap`,
`VehicleCurrentLocation`

**Trong tab Trang chủ:** `Home`, `Asset`, `AssetList`, `AssetDetails`,
`AssetRelatedList`, `AssetRelatedDetails`, `AssetHistoryDetail`, `Report`,
`Camera`, `CameraList`, `CameraListGrid`, `VehicleJourney`, `VehicleTracking`,
`SolarPlant`, `ShareholdersMeeting`

**Trong tab Cài đặt:** `Setting`, `Profile`, `Appearance`

Cần route mới → thêm một dòng vào `PUSH_ROUTES` trong `pushRoutes.ts`.

---

## 5. Hành vi hiển thị (đã xử lý chống trùng)

| Trạng thái app | `notification` + `data` | data-only |
|---|---|---|
| Đang mở (foreground) | app hiển thị qua notifee | app hiển thị qua notifee |
| Background | **OS hiển thị**, app bỏ qua | app hiển thị qua notifee (iOS: best-effort) |
| Đã tắt (quit) | **OS hiển thị**, app bỏ qua | Android: app hiển thị · **iOS: KHÔNG tới** |

Không bao giờ có 2 thông báo trùng: quyết định nằm ở `shouldDisplayLocally`, cộng
thêm một lớp dedupe theo `notificationId`.

Thông báo không có cả `title` và `body` sẽ **không** được hiển thị — dùng dạng này
nếu chỉ muốn đẩy dữ liệu ngầm.

---

## 6. Điều hướng khi user bấm thông báo

App gom cả 4 đường vào chung một handler, dedupe theo `notificationId`:

| Nguồn | Trường hợp |
|---|---|
| `onNotificationOpenedApp` | thông báo OS dựng, app đang ở background |
| `getInitialNotification` | thông báo OS dựng, app từ trạng thái quit |
| `notifee.onForegroundEvent` | thông báo notifee dựng, app đang mở |
| `notifee.onBackgroundEvent` + `notifee.getInitialNotification` | thông báo notifee dựng, app ở background/quit |

Lần bấm được **giữ lại** nếu chưa điều hướng được (app chưa đăng nhập, iOS chưa
qua Face ID, NavigationContainer chưa mount) và tự chạy lại khi đủ điều kiện.

---

## 7. Cách test nhanh

1. Chạy app trên **máy thật** (iOS simulator không có APNs → không lấy được token).
2. Đăng nhập, xem log `[Push] Lấy FCM token thành công`. Cần token đầy đủ để test
   thì tạm log full token trong [token.ts](src/services/notifications/token.ts).
3. Gửi thử bằng Firebase Console (*Engage → Messaging*) hoặc FCM HTTP v1 API với
   payload ở mục 3.
4. Test đủ 3 trạng thái: app đang mở, app ở background, app đã swipe tắt.

---

## 8. Xin quyền thông báo

Dùng thẳng dialog của hệ điều hành, không có bước giải thích thêm
(xem [permissions.ts](src/services/notifications/permissions.ts)).

- **iOS**: gọi qua RNFB messaging — đây đồng thời là bước kích hoạt đăng ký APNs.
  Nội dung dialog là text của Apple, không sửa được: iOS không có
  usage-description key cho quyền thông báo (không tồn tại
  `NSUserNotificationsUsageDescription` kiểu như `NSCameraUsageDescription`).
  Dialog chỉ hiện **đúng một lần** trong đời app; sau khi user từ chối thì phải vào
  Cài đặt để bật lại — dùng `openNotificationSettings()`.
- **Android**: gọi qua notifee (RNFB là no-op trên Android). Dialog
  `POST_NOTIFICATIONS` do OS tự dịch theo ngôn ngữ máy.

Tên và mô tả channel — phần app kiểm soát được và hiện trong *Cài đặt → Thông
báo* — đã là tiếng Việt trong
[channels.ts](src/services/notifications/channels.ts).

### Công tắc trong màn Cài đặt

Màn Cài đặt của app có dòng "Quyền thông báo" hoạt động giống dòng "Quyền camera"
(xem [SettingScreen.tsx](src/screens/Settings/SettingScreen.tsx)). Trạng thái hiển
thị lấy từ `checkNotificationPermission()` qua `getNotificationPermissionLabel()`:

| Trạng thái | Nhãn | Bật công tắc thì… |
|---|---|---|
| `granted` | Đã cấp quyền | — |
| `denied` | Chưa cấp quyền | gọi dialog hệ thống |
| `blocked` | Đã chặn quyền | Alert dẫn vào Cài đặt (dialog sẽ không hiện) |
| `unknown` | Chưa xác định | thử gọi dialog |

Tắt công tắc luôn dẫn vào Cài đặt — hệ điều hành không cho app tự thu hồi quyền.
Trạng thái được refresh mỗi lần vào lại màn Cài đặt nên đổi quyền ngoài Cài đặt
hệ thống rồi quay lại là thấy đúng ngay.

---

## 9. Ghi chú cấu hình native (đã làm)

- **iOS**: `aps-environment` trong `qlts_app_2.entitlements`,
  `CODE_SIGN_ENTITLEMENTS` ở cả Debug/Release, capability `com.apple.Push`,
  `UIBackgroundModes: remote-notification`, `FirebaseApp.configure()` trong
  `AppDelegate.swift`, `$RNFirebaseAsStaticFramework = true` trong Podfile.
- **Android**: `POST_NOTIFICATIONS`, meta-data
  `default_notification_channel_id` / `_icon` / `_color`, drawable
  `ic_notification.xml` (silhouette trắng).
- Cần **APNs Auth Key (.p8)** đã upload vào Firebase Console → Project settings →
  Cloud Messaging → *Apple app configuration*, nếu chưa có thì iOS không nhận được
  thông báo dù app đã đúng.
