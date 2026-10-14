jest.mock("@notifee/react-native", () => ({
  __esModule: true,
  default: {
    setBadgeCount: jest.fn(),
    getDisplayedNotifications: jest.fn(),
    cancelDisplayedNotification: jest.fn(),
  },
}));

import notifee from "@notifee/react-native";
import {
  buildThongBaoPushTarget,
  claimThongBaoToast,
  getPushSoChuaDoc,
  isThongBaoPush,
  removeThongBaoFromTray,
  setAppBadgeCount,
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
});
