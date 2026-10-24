jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    setBadgeCount: jest.fn(),
    getDisplayedNotifications: jest.fn(),
    cancelDisplayedNotification: jest.fn(),
    displayNotification: jest.fn(),
  },
  AndroidImportance: { LOW: 2 },
}));

import { Platform } from "react-native";

import notifee from "@notifee/react-native";
import {
  buildThongBaoPushTarget,
  claimThongBaoToast,
  getPushSoChuaDoc,
  isThongBaoPush,
  removeThongBaoFromTray,
  handleThongBaoBadgeDismissed,
  showThongBaoInTray,
  setAppBadgeCount,
  THONG_BAO_BADGE_NOTIFICATION_ID,
  thongBaoItemFromPush,
} from "../src/services/notifications/thongBaoPush";

// Mẫu payload của 8-Mobile-ThongBao mục 6 (mọi giá trị là chuỗi).
const congViec = {
  type: "THONG_BAO",
  title: "Bạn được giao Chủ trì: CV.000016",
  body: "Kiểm kê kho · hạn 15/10/2026 17:00",
  loai: "Giao",
  nhom: "CongViec",
  iD_ThongBao: "167",
  tenBang: "CV_CongViec",
  iD_DoiTuong: "16",
  iD_CongViec: "16",
  soChuaDoc: "6",
};

describe("push THONG_BAO", () => {
  it("nhận đúng type; push badge im lặng (không type) và camera thì không", () => {
    expect(isThongBaoPush(congViec)).toBe(true);
    expect(isThongBaoPush({})).toBe(false);
    expect(isThongBaoPush({ type: "CAMERA_AI" })).toBe(false);
  });

  it("mở theo nhom: công việc · kế hoạch · phiếu (Name = tenBang)", () => {
    expect(buildThongBaoPushTarget(congViec)).toEqual({ route: "CongViecChiTiet", params: { id: 16 } });
    expect(
      buildThongBaoPushTarget({ type: "THONG_BAO", nhom: "KeHoach", tenBang: "CV_KeHoach", iD_KeHoach: "3" }),
    ).toEqual({ route: "KeHoachChiTiet", params: { id: 3 } });
    expect(
      buildThongBaoPushTarget({ type: "THONG_BAO", nhom: "Flow", tenBang: "Ticket_PhongBan", iD_HoSo: "21" }),
    ).toEqual({ route: "FlowChiTiet", params: { nameClass: "Ticket_PhongBan", id: 21 } });
    // Thiếu khoá theo nhóm thì lấy iD_DoiTuong; thiếu cả hai thì không mở gì.
    expect(buildThongBaoPushTarget({ nhom: "Flow", tenBang: "Ticket_PhongBan", iD_DoiTuong: "9" })?.params.id).toBe(9);
    expect(buildThongBaoPushTarget({ nhom: "CongViec", tenBang: "CV_CongViec" })).toBeNull();
    // Push bình luận mở thẳng màn Bình luận như bấm trong chuông.
    expect(
      buildThongBaoPushTarget({ nhom: "Flow", loai: "BinhLuan", tenBang: "Ticket_PhongBan", iD_HoSo: "21" })
        ?.binhLuan,
    ).toEqual({ apiBase: "Ticket_PhongBan", idHoSo: 21, canSend: true });
  });

  it("số chưa đọc: 0 hợp lệ, thiếu / sai là null", () => {
    expect(getPushSoChuaDoc(congViec)).toBe(6);
    expect(getPushSoChuaDoc({ soChuaDoc: "0" })).toBe(0);
    expect(getPushSoChuaDoc({})).toBeNull();
    expect(getPushSoChuaDoc({ soChuaDoc: "abc" })).toBeNull();
  });

  it("dựng dòng thông báo từ push để toast; toast mỗi id 1 lần", () => {
    const item = thongBaoItemFromPush(congViec);
    expect(item).toMatchObject({ id: 167, nhom: "CongViec", tieuDe: congViec.title, iD_DoiTuong: 16, daDoc: false });
    expect(thongBaoItemFromPush({ type: "THONG_BAO" })).toBeNull();
    expect(claimThongBaoToast(167)).toBe(true);
    expect(claimThongBaoToast(167)).toBe(false);
  });

  it("số trên icon: đặt đúng số, không âm", async () => {
    await setAppBadgeCount(6);
    await setAppBadgeCount(-2);
    expect((notifee.setBadgeCount as jest.Mock).mock.calls).toEqual([[6], [0]]);
  });

  it("gỡ khỏi khay đúng thông báo đã đọc, không đụng noti camera", async () => {
    const shown = [
      { id: "a", notification: { data: { type: "THONG_BAO", iD_ThongBao: "167" } } },
      { id: "b", notification: { data: { type: "THONG_BAO", iD_ThongBao: "168" } } },
      { id: "c", notification: { data: { type: "CAMERA_AI" } } },
    ];
    const cancel = notifee.cancelDisplayedNotification as jest.Mock;
    (notifee.getDisplayedNotifications as jest.Mock).mockResolvedValue(shown);

    await removeThongBaoFromTray([167]);
    expect(cancel.mock.calls).toEqual([["a"]]);

    cancel.mockClear();
    await removeThongBaoFromTray("all");
    expect(cancel.mock.calls).toEqual([["a"], ["b"]]);
  });

  describe("số trên icon Android (thông báo tóm tắt bù số)", () => {
    const display = notifee.displayNotification as jest.Mock;
    const cancel = notifee.cancelDisplayedNotification as jest.Mock;
    const shownMock = notifee.getDisplayedNotifications as jest.Mock;

    beforeEach(() => {
      Platform.OS = "android";
      display.mockClear();
      cancel.mockClear();
      (notifee.setBadgeCount as jest.Mock).mockClear();
    });
    afterAll(() => {
      Platform.OS = "ios";
    });

    it("khay trống: tóm tắt mang đủ số chưa đọc, không gọi setBadgeCount", async () => {
      shownMock.mockResolvedValue([]);
      await setAppBadgeCount(6);
      expect(notifee.setBadgeCount).not.toHaveBeenCalled();
      expect(display.mock.calls[0][0]).toMatchObject({
        id: THONG_BAO_BADGE_NOTIFICATION_ID,
        android: { badgeCount: 6 },
      });
    });

    it("trừ các thông báo khác đang trên khay (không trừ chính nó)", async () => {
      shownMock.mockResolvedValue([
        { id: THONG_BAO_BADGE_NOTIFICATION_ID, notification: {} },
        { id: "a", notification: { data: { type: "THONG_BAO", iD_ThongBao: "167" } } },
        { id: "b", notification: {} },
      ]);
      await setAppBadgeCount(5);
      expect(display.mock.calls[0][0].android.badgeCount).toBe(3);
    });

    it("khay đã đủ số hoặc về 0: gỡ tóm tắt", async () => {
      shownMock.mockResolvedValue([{ id: "a", notification: {} }]);
      await setAppBadgeCount(1);
      await setAppBadgeCount(0);
      expect(display).not.toHaveBeenCalled();
      expect(cancel.mock.calls).toEqual([[THONG_BAO_BADGE_NOTIFICATION_ID], [THONG_BAO_BADGE_NOTIFICATION_ID]]);
    });

    it("xoá khay (tóm tắt bị xoá): mở lại app không dựng lại; đọc hết thì bật lại", async () => {
      shownMock.mockResolvedValue([]);
      await handleThongBaoBadgeDismissed({ id: THONG_BAO_BADGE_NOTIFICATION_ID });
      await setAppBadgeCount(11);
      expect(display).not.toHaveBeenCalled();
      expect(cancel).toHaveBeenLastCalledWith(THONG_BAO_BADGE_NOTIFICATION_ID);

      await setAppBadgeCount(0);
      await setAppBadgeCount(2);
      expect(display.mock.calls[0][0].android.badgeCount).toBe(2);
    });

    it("push lúc đang mở app: đặt im lặng lên khay trước rồi tóm tắt mới bù", async () => {
      shownMock.mockResolvedValue([]);
      await setAppBadgeCount(5);
      expect(display.mock.calls[0][0].android.badgeCount).toBe(5);

      shownMock.mockResolvedValue([{ id: "push-1", notification: {} }]);
      await setAppBadgeCount(6);
      await showThongBaoInTray({ id: "push-1", title: congViec.title, data: congViec });
      const push = display.mock.calls.find(([n]) => n.id === "push-1")?.[0];
      expect(push).toMatchObject({ data: congViec, android: { channelId: "qlts_silent" } });
      // Push 1 + tóm tắt 5 = 6 trên icon.
      expect(display.mock.calls.at(-1)[0]).toMatchObject({
        id: THONG_BAO_BADGE_NOTIFICATION_ID,
        android: { badgeCount: 5 },
      });
    });
  });
});
