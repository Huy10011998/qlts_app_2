import { createDedupeStore } from "../src/services/notifications/dedupe";
import {
  normalizeRemoteMessage,
  parseNotificationParams,
} from "../src/services/notifications/payload";
import { shouldDisplayLocally } from "../src/services/notifications/display";
import { resolveChannelId } from "../src/services/notifications/channels";
import {
  isKnownPushRoute,
  navigateToPushRoute,
} from "../src/services/notifications/pushRoutes";
import { navigationRef } from "../src/navigation/navigationService";
import {
  DEFAULT_CHANNEL_ID,
  SILENT_CHANNEL_ID,
  URGENT_CHANNEL_ID,
} from "../src/services/notifications/constants";

type RemoteMessageArg = Parameters<typeof normalizeRemoteMessage>[0];

/**
 * RemoteMessage của RNFB khai báo `fcmOptions` là bắt buộc nên không dựng được
 * bằng object literal. Helper chỉ điền phần thiếu, không đổi hành vi test.
 */
const makeRemoteMessage = (
  partial: Partial<RemoteMessageArg>,
): RemoteMessageArg => partial as RemoteMessageArg;

describe("normalizeRemoteMessage", () => {
  it("ưu tiên title/body từ khối notification", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m1",
        notification: { title: "Từ notification", body: "Nội dung" },
        data: { title: "Từ data", body: "Bỏ qua" },
      }),
    );

    expect(message.title).toBe("Từ notification");
    expect(message.body).toBe("Nội dung");
    expect(message.hasOsNotification).toBe(true);
  });

  it("dùng title/body trong data khi BE gửi data-only", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m2",
        data: { title: "Chỉ có data", body: "Nội dung data" },
      }),
    );

    expect(message.title).toBe("Chỉ có data");
    expect(message.body).toBe("Nội dung data");
    expect(message.hasOsNotification).toBe(false);
  });

  it("ép mọi giá trị data về string", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m3",
        data: { nested: { id: 7 }, plain: "x" },
      }),
    );

    expect(message.data.nested).toBe('{"id":7}');
    expect(message.data.plain).toBe("x");
  });

  it("ưu tiên notificationId của BE làm khóa dedupe", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "fcm-id",
        data: { notificationId: "be-id" },
      }),
    );

    expect(message.id).toBe("be-id");
  });

  it("dùng messageId khi BE không gửi notificationId", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({ messageId: "fcm-id", data: { route: "Asset" } }),
    );

    expect(message.id).toBe("fcm-id");
  });

  it("sinh id ổn định khi thiếu cả notificationId và messageId", () => {
    const payload = makeRemoteMessage({
      notification: { title: "A", body: "B" },
      data: { route: "Asset" },
    });

    const first = normalizeRemoteMessage(payload);
    const second = normalizeRemoteMessage(payload);

    expect(first.id).toBe(second.id);
    expect(first.id.length).toBeGreaterThan(0);
  });

  it("bỏ qua giá trị null/undefined trong data", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({
        messageId: "m4",
        data: {
          keep: "1",
          drop: null as unknown as string,
          alsoDrop: undefined as unknown as string,
        },
      }),
    );

    expect(message.data).toEqual({ keep: "1" });
  });

  it("không có data thì trả về object rỗng", () => {
    const message = normalizeRemoteMessage(
      makeRemoteMessage({ messageId: "m5" }),
    );

    expect(message.data).toEqual({});
    expect(message.channelId).toBe(DEFAULT_CHANNEL_ID);
  });
});

describe("shouldDisplayLocally", () => {
  const withOsNotification = normalizeRemoteMessage(
    makeRemoteMessage({
      messageId: "a",
      notification: { title: "t", body: "b" },
    }),
  );
  const dataOnly = normalizeRemoteMessage(
    makeRemoteMessage({ messageId: "b", data: { title: "t", body: "b" } }),
  );

  it("foreground: luôn tự hiển thị vì OS không hiện", () => {
    expect(shouldDisplayLocally(withOsNotification, true)).toBe(true);
    expect(shouldDisplayLocally(dataOnly, true)).toBe(true);
  });

  it("background: không hiển thị lại thông báo OS đã dựng", () => {
    expect(shouldDisplayLocally(withOsNotification, false)).toBe(false);
  });

  it("background: tự hiển thị message data-only", () => {
    expect(shouldDisplayLocally(dataOnly, false)).toBe(true);
  });
});

describe("resolveChannelId", () => {
  it("map alias của BE về channel thật", () => {
    expect(resolveChannelId("urgent")).toBe(URGENT_CHANNEL_ID);
    expect(resolveChannelId("HIGH")).toBe(URGENT_CHANNEL_ID);
    expect(resolveChannelId(" silent ")).toBe(SILENT_CHANNEL_ID);
    expect(resolveChannelId(URGENT_CHANNEL_ID)).toBe(URGENT_CHANNEL_ID);
  });

  it("về channel mặc định khi thiếu hoặc alias lạ", () => {
    expect(resolveChannelId()).toBe(DEFAULT_CHANNEL_ID);
    expect(resolveChannelId("khong-ton-tai")).toBe(DEFAULT_CHANNEL_ID);
  });
});

describe("parseNotificationParams", () => {
  it("parse JSON string thành object", () => {
    expect(parseNotificationParams('{"id":12,"name":"x"}')).toEqual({
      id: 12,
      name: "x",
    });
  });

  it("trả undefined với JSON sai, mảng, hoặc rỗng", () => {
    expect(parseNotificationParams("{khong-phai-json")).toBeUndefined();
    expect(parseNotificationParams("[1,2]")).toBeUndefined();
    expect(parseNotificationParams("")).toBeUndefined();
    expect(parseNotificationParams(undefined)).toBeUndefined();
  });
});

describe("createDedupeStore", () => {
  it("claim lần đầu thành công, lần sau bị chặn", () => {
    const store = createDedupeStore(3);

    expect(store.claim("a")).toBe(true);
    expect(store.claim("a")).toBe(false);
  });

  it("release cho phép claim lại", () => {
    const store = createDedupeStore(3);

    store.claim("a");
    store.release("a");

    expect(store.claim("a")).toBe(true);
  });

  it("loại bỏ phần tử cũ nhất khi vượt giới hạn", () => {
    const store = createDedupeStore(2);

    store.claim("a");
    store.claim("b");
    store.claim("c");

    expect(store.has("a")).toBe(false);
    expect(store.has("b")).toBe(true);
    expect(store.has("c")).toBe(true);
  });
});

describe("pushRoutes", () => {
  const navigateSpy = jest.spyOn(navigationRef, "navigate");
  const isReadySpy = jest.spyOn(navigationRef, "isReady");

  beforeEach(() => {
    navigateSpy.mockReset();
    navigateSpy.mockImplementation(() => {});
    isReadySpy.mockReturnValue(true);
  });

  afterAll(() => {
    navigateSpy.mockRestore();
    isReadySpy.mockRestore();
  });

  it("nhận diện route trong whitelist", () => {
    expect(isKnownPushRoute("Asset")).toBe(true);
    expect(isKnownPushRoute("CameraPlayback")).toBe(true);
    expect(isKnownPushRoute("KhongTonTai")).toBe(false);
    expect(isKnownPushRoute(undefined)).toBe(false);
  });

  it("navigate phẳng cho màn hình ở root stack", () => {
    expect(navigateToPushRoute("CameraPlayback", { id: 1 })).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith("CameraPlayback", { id: 1 });
  });

  it("navigate phẳng cho màn chi tiết đã tách khỏi Tabs", () => {
    expect(navigateToPushRoute("Asset", { groupMenuId: 5 })).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith("Asset", { groupMenuId: 5 });
  });

  it("navigate lồng nhau cho màn gốc của tab", () => {
    expect(navigateToPushRoute("Home")).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith("Tabs", {
      screen: "HomeTab",
      params: { screen: "Home", params: undefined },
    });

    expect(navigateToPushRoute("Setting")).toBe(true);
    expect(navigateSpy).toHaveBeenCalledWith("Tabs", {
      screen: "SettingTab",
      params: { screen: "Setting", params: undefined },
    });
  });

  it("từ chối route ngoài whitelist mà không navigate", () => {
    expect(navigateToPushRoute("RouteLa")).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("trả false khi NavigationContainer chưa sẵn sàng", () => {
    isReadySpy.mockReturnValue(false);

    expect(navigateToPushRoute("Asset")).toBe(false);
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("trả false khi navigate ném lỗi thay vì làm crash app", () => {
    navigateSpy.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(navigateToPushRoute("Asset")).toBe(false);
  });
});
