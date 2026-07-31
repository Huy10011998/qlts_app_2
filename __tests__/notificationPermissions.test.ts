import { Platform } from "react-native";
import notifee from "@notifee/react-native";
import {
  hasPermission,
  requestPermission,
} from "@react-native-firebase/messaging";
import { checkNotifications } from "react-native-permissions";
import {
  checkNotificationPermission,
  ensureNotificationPermission,
  getNotificationPermissionLabel,
  hasNotificationPermission,
  requestNotificationPermission,
} from "../src/services/notifications/permissions";

const mockedNotifee = notifee as jest.Mocked<typeof notifee>;
const mockedHasPermission = hasPermission as jest.Mock;
const mockedRequestPermission = requestPermission as jest.Mock;
const mockedCheckNotifications = checkNotifications as jest.Mock;

/** Platform.OS được đọc trong thân hàm nên gán trực tiếp là đủ. */
const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
};

const originalPlatform = Platform.OS;

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  setPlatform(originalPlatform as "ios" | "android");
});

describe("checkNotificationPermission — iOS", () => {
  beforeEach(() => setPlatform("ios"));

  it("AUTHORIZED và PROVISIONAL đều là granted", async () => {
    mockedHasPermission.mockResolvedValue(1);
    await expect(checkNotificationPermission()).resolves.toBe("granted");

    mockedHasPermission.mockResolvedValue(2);
    await expect(checkNotificationPermission()).resolves.toBe("granted");
  });

  it("NOT_DETERMINED → denied (còn xin được)", async () => {
    mockedHasPermission.mockResolvedValue(-1);
    await expect(checkNotificationPermission()).resolves.toBe("denied");
  });

  it("DENIED → blocked vì iOS không hiện dialog lần 2", async () => {
    mockedHasPermission.mockResolvedValue(0);
    await expect(checkNotificationPermission()).resolves.toBe("blocked");
  });

  it("native throw → unknown, không khẳng định sai là đã chặn", async () => {
    mockedHasPermission.mockRejectedValue(new Error("boom"));
    await expect(checkNotificationPermission()).resolves.toBe("unknown");
  });
});

describe("checkNotificationPermission — Android", () => {
  beforeEach(() => setPlatform("android"));

  it("notifee báo đã bật → granted, không hỏi thêm", async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 1,
    } as never);

    await expect(checkNotificationPermission()).resolves.toBe("granted");
    expect(mockedCheckNotifications).not.toHaveBeenCalled();
    expect(mockedHasPermission).not.toHaveBeenCalled();
  });

  it("chưa bật + DENIED → denied", async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 0,
    } as never);
    mockedCheckNotifications.mockResolvedValue({ status: "denied" });

    await expect(checkNotificationPermission()).resolves.toBe("denied");
  });

  it("chưa bật + BLOCKED → blocked", async () => {
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 0,
    } as never);
    mockedCheckNotifications.mockResolvedValue({ status: "blocked" });

    await expect(checkNotificationPermission()).resolves.toBe("blocked");
  });
});

describe("hasNotificationPermission", () => {
  beforeEach(() => setPlatform("ios"));

  it("chỉ true khi granted", async () => {
    mockedHasPermission.mockResolvedValue(1);
    await expect(hasNotificationPermission()).resolves.toBe(true);

    mockedHasPermission.mockResolvedValue(0);
    await expect(hasNotificationPermission()).resolves.toBe(false);

    mockedHasPermission.mockResolvedValue(-1);
    await expect(hasNotificationPermission()).resolves.toBe(false);
  });
});

describe("getNotificationPermissionLabel", () => {
  it("nhãn tiếng Việt khớp với dòng quyền camera", () => {
    expect(getNotificationPermissionLabel("granted")).toBe("Đã cấp quyền");
    expect(getNotificationPermissionLabel("denied")).toBe("Chưa cấp quyền");
    expect(getNotificationPermissionLabel("blocked")).toBe("Đã chặn quyền");
    expect(getNotificationPermissionLabel("unknown")).toBe("Chưa xác định");
  });
});

describe("requestNotificationPermission", () => {
  it("iOS dùng RNFB (để kích hoạt đăng ký APNs)", async () => {
    setPlatform("ios");
    mockedRequestPermission.mockResolvedValue(1);

    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(mockedRequestPermission).toHaveBeenCalled();
    expect(mockedNotifee.requestPermission).not.toHaveBeenCalled();
  });

  it("iOS từ chối ở dialog → blocked (không hiện lại lần nào nữa)", async () => {
    setPlatform("ios");
    mockedRequestPermission.mockResolvedValue(0);

    await expect(requestNotificationPermission()).resolves.toBe("blocked");
  });

  it("Android dùng notifee (RNFB là no-op)", async () => {
    setPlatform("android");
    mockedNotifee.requestPermission.mockResolvedValue({
      authorizationStatus: 1,
    } as never);

    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(mockedNotifee.requestPermission).toHaveBeenCalled();
    expect(mockedRequestPermission).not.toHaveBeenCalled();
  });

  it("Android từ chối → đọc lại để phân biệt denied với blocked", async () => {
    setPlatform("android");
    mockedNotifee.requestPermission.mockResolvedValue({
      authorizationStatus: 0,
    } as never);
    mockedNotifee.getNotificationSettings.mockResolvedValue({
      authorizationStatus: 0,
    } as never);
    mockedCheckNotifications.mockResolvedValue({ status: "blocked" });

    await expect(requestNotificationPermission()).resolves.toBe("blocked");
  });

  it("native throw → unknown, không làm sập luồng", async () => {
    setPlatform("ios");
    mockedRequestPermission.mockRejectedValue(new Error("boom"));

    await expect(requestNotificationPermission()).resolves.toBe("unknown");
  });
});

describe("ensureNotificationPermission", () => {
  beforeEach(() => setPlatform("ios"));

  it("đã có quyền → không gọi dialog hệ thống", async () => {
    mockedHasPermission.mockResolvedValue(1);

    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(mockedRequestPermission).not.toHaveBeenCalled();
  });

  it("chưa hỏi lần nào → gọi dialog hệ thống", async () => {
    mockedHasPermission.mockResolvedValue(-1);
    mockedRequestPermission.mockResolvedValue(1);

    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(mockedRequestPermission).toHaveBeenCalled();
  });

  it("đã bị chặn → bỏ qua dialog vì gọi cũng không hiện gì", async () => {
    mockedHasPermission.mockResolvedValue(0);

    await expect(ensureNotificationPermission()).resolves.toBe(false);
    expect(mockedRequestPermission).not.toHaveBeenCalled();
  });
});
