/**
 * Contract giữa BE và app cho push notification.
 *
 * FCM chỉ truyền `data` dưới dạng string → string, nên mọi field lồng nhau BE
 * muốn gửi phải được JSON.stringify (xem `params`).
 */

export type PushPlatform = "android" | "ios";

/**
 * Các khóa app hiểu trong khối `data` của FCM payload. BE gửi thêm khóa lạ cũng
 * không sao — chúng được giữ nguyên trong `NormalizedPushMessage.data` để màn
 * hình đích tự đọc.
 */
export type KnownPushDataKeys = {
  /** Phân loại nghiệp vụ. Hiện BE gửi "CAMERA_MOTION" (xem `cameraPush`). */
  type?: string;
  /** Tên route trong RootNavigator để mở khi user bấm vào thông báo. */
  route?: string;
  /** Params của route, dạng JSON string. Ví dụ: '{"id":123}'. */
  params?: string;
  /** "default" | "urgent" | "silent" (xem CHANNEL_ALIASES). */
  channelId?: string;
  /** Id ổn định do BE sinh — dùng để chống hiển thị trùng. */
  notificationId?: string;
  /** Tiêu đề/nội dung khi BE gửi data-only (không có khối `notification`). */
  title?: string;
  body?: string;
};

/**
 * Khối `data` của thông báo "đầu ghi phát hiện chuyển động".
 *
 * FCM chỉ truyền string nên mọi số cũng là chuỗi — ép kiểu ở `cameraPush`,
 * đừng dùng thẳng. Luôn đọc theo key, ĐỪNG parse chuỗi title/body: BE có thể
 * đổi text bất cứ lúc nào.
 */
export type CameraMotionPushData = {
  type: "CAMERA_MOTION";
  /** Khoá chính để mở live view. */
  ID_Camera: string;
  CameraMa: string;
  CameraTen: string;
  ViTri: string;
  VungCamera: string;
  ID_DauGhi: string;
  /** Số kênh trên đầu ghi. */
  Kenh: string;
  /** "VMD" = motion detection. */
  EventType: string;
  /** "2026-08-27 09:13:58" — giờ server, không có timezone offset. */
  ThoiGian: string;
  /** BE lặp lại title/body trong data cho tiện dựng noti lúc app đang mở. */
  title?: string;
  body?: string;
};

/** Message đã được chuẩn hóa, an toàn để hiển thị & định tuyến. */
export type NormalizedPushMessage = {
  /** Khóa dedupe. Ưu tiên data.notificationId → messageId → hash payload. */
  id: string;
  title?: string;
  body?: string;
  /** Mọi giá trị đã được ép về string. */
  data: Record<string, string>;
  /** Channel id thật đã resolve qua CHANNEL_ALIASES. */
  channelId: string;
  /**
   * true khi FCM payload có khối `notification` → hệ điều hành đã (hoặc sẽ) tự
   * dựng thông báo ở background/quit. App KHÔNG được hiển thị lại, nếu không
   * user sẽ thấy 2 thông báo giống nhau.
   */
  hasOsNotification: boolean;
};

/** Nguồn phát sinh hành vi "user bấm vào thông báo". */
export type PushTapSource =
  /** FCM notification, app đang ở background → foreground. */
  | "fcm-opened"
  /** FCM notification, app từ trạng thái quit. */
  | "fcm-initial"
  /** Thông báo do notifee hiển thị, bấm khi app còn sống. */
  | "notifee-foreground"
  /** Thông báo do notifee hiển thị, bấm khi app ở background. */
  | "notifee-background"
  /** Thông báo do notifee hiển thị, bấm từ trạng thái quit. */
  | "notifee-initial";

export type PushTapPayload = {
  id: string;
  data: Record<string, string>;
  source: PushTapSource;
};

/** Body gửi lên BE để map token ↔ user (POST /api/Common/update-fcm-token). */
export type PushTokenRegistration = {
  fcmToken: string;
  platform: PushPlatform;
};

/** Bản ghi cache local của lần đăng ký thành công gần nhất. */
export type PushRegistrationCache = {
  token: string;
  appVersion: string;
  buildNumber: string;
};
