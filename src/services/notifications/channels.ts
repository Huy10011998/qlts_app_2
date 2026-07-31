import { Platform } from "react-native";
import notifee, {
  AndroidChannel,
  AndroidImportance,
  AndroidVisibility,
} from "@notifee/react-native";
import { log, warn } from "../../utils/Logger";
import {
  CHANNEL_ALIASES,
  DEFAULT_CHANNEL_ID,
  SILENT_CHANNEL_ID,
  URGENT_CHANNEL_ID,
} from "./constants";

const ANDROID_CHANNELS: AndroidChannel[] = [
  {
    id: DEFAULT_CHANNEL_ID,
    name: "Thông báo chung",
    description: "Thông báo nghiệp vụ từ hệ thống Cholimex Food",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PRIVATE,
    sound: "default",
    vibration: true,
  },
  {
    id: URGENT_CHANNEL_ID,
    name: "Thông báo ưu tiên",
    description: "Cảnh báo cần xử lý ngay",
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PRIVATE,
    sound: "default",
    vibration: true,
    // Rung dài hơn để phân biệt với thông báo thường.
    vibrationPattern: [300, 500, 300, 500],
  },
  {
    id: SILENT_CHANNEL_ID,
    name: "Thông báo im lặng",
    description: "Thông báo phụ, không phát âm và không rung",
    importance: AndroidImportance.LOW,
    visibility: AndroidVisibility.PRIVATE,
    vibration: false,
  },
];

/**
 * Cache promise để không gọi createChannels nhiều lần trong cùng một JS runtime.
 * Vẫn an toàn khi gọi lặp lại: createChannel của Android là idempotent.
 */
let channelsPromise: Promise<void> | null = null;

const createChannels = async () => {
  try {
    await notifee.createChannels(ANDROID_CHANNELS);
    log("[Push] Android channels ready", {
      channels: ANDROID_CHANNELS.map((channel) => channel.id),
    });
  } catch (err) {
    // Không được throw: channel lỗi thì thông báo vẫn về được channel mặc định
    // của hệ thống, chặn luồng ở đây sẽ làm mất luôn thông báo.
    warn("[Push] Create Android channels failed", err);
    channelsPromise = null;
  }
};

/**
 * Tạo các notification channel trên Android. No-op trên iOS.
 *
 * Phải được gọi trước lần displayNotification đầu tiên — kể cả trong background
 * handler, vì khi app bị kill thì runtime mới không giữ lại cache này.
 */
export const ensureNotificationChannels = (): Promise<void> => {
  if (Platform.OS !== "android") return Promise.resolve();

  if (!channelsPromise) {
    channelsPromise = createChannels();
  }

  return channelsPromise;
};

/**
 * Ép channelId do BE gửi về một channel đã tồn tại. Alias lạ → channel mặc định,
 * tránh trường hợp Android bỏ im lặng thông báo vì channel không tồn tại.
 */
export const resolveChannelId = (rawChannelId?: string): string => {
  if (!rawChannelId) return DEFAULT_CHANNEL_ID;

  const resolved = CHANNEL_ALIASES[rawChannelId.trim().toLowerCase()];

  if (!resolved) {
    warn("[Push] Unknown channelId from BE → dùng channel mặc định", {
      rawChannelId,
    });
    return DEFAULT_CHANNEL_ID;
  }

  return resolved;
};
