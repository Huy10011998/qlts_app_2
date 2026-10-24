import {
  applyDangNhap,
  applyThuHoi,
  DANG_NHAP_TTL_MS,
  formatDangNhapLabel,
  getReplyPreview,
  getThumbnailSize,
  mergeRealtimeComment,
  pruneDangNhap,
  removeDangNhap,
} from "../src/screens/Workflow/Common/realtimeCommentRules";
import type { WorkflowComment } from "../src/types/index";

// Luật của 7-Mobile-Realtime-BinhLuan: BinhLuanMoi thêm nếu chưa có id, xếp
// theo ngayTao; "đang nhập" hạn 40 giây, bỏ chính mình, nhãn theo số người.

const binhLuan = (id: number, ngayTao: string, iD_NhanVien = 202): WorkflowComment => ({
  id,
  iD_NhanVien,
  iD_NhanVien_MoTa: "Nhân viên Test 2",
  noiDung: `bình luận ${id}`,
  ngayTao,
});

describe("BinhLuanMoi", () => {
  const items = [binhLuan(1, "2026-10-14T10:00:00"), binhLuan(3, "2026-10-14T10:30:00")];

  it("thêm và xếp theo ngayTao", () => {
    const next = mergeRealtimeComment(items, binhLuan(2, "2026-10-14T10:15:00.153"));
    expect(next.map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("đã có id (mình vừa gửi rồi nạp lại) thì bỏ qua, giữ nguyên mảng", () => {
    expect(mergeRealtimeComment(items, binhLuan(3, "2026-10-14T10:30:00"))).toBe(items);
  });
});

describe("đang nhập", () => {
  const now = 1_000_000;
  const event = (id: number, ten: string, dangNhap = true) => ({ iD_NhanVien: id, ten, dangNhap });

  it("thứ tự = ai nhập trước; nhắc lại chỉ gia hạn, không đổi chỗ", () => {
    let list = applyDangNhap([], event(203, "A"), 7, now);
    list = applyDangNhap(list, event(204, "B"), 7, now + 1000);
    list = applyDangNhap(list, event(203, "A"), 7, now + 15_000);
    expect(list.map((entry) => entry.ten)).toEqual(["A", "B"]);
    expect(list[0].expiresAt).toBe(now + 15_000 + DANG_NHAP_TTL_MS);
  });

  it("bỏ qua chính mình (máy khác của mình); false thì bỏ người đó", () => {
    expect(applyDangNhap([], event(7, "Tôi"), 7, now)).toEqual([]);
    const list = applyDangNhap([], event(203, "A"), 7, now);
    expect(applyDangNhap(list, event(203, "A", false), 7, now)).toEqual([]);
    expect(removeDangNhap(list, 203)).toEqual([]);
  });

  it("quá 40 giây không nghe nhắc lại thì tự bỏ", () => {
    const list = applyDangNhap([], event(203, "A"), 7, now);
    expect(pruneDangNhap(list, now + DANG_NHAP_TTL_MS - 1)).toBe(list);
    expect(pruneDangNhap(list, now + DANG_NHAP_TTL_MS)).toEqual([]);
  });

  it("nhãn: 1 người · 2 người · từ 3 người", () => {
    const people = ["A", "B", "C"].map((ten, i) => ({ iD_NhanVien: i, ten, expiresAt: now }));
    expect(formatDangNhapLabel([])).toBeNull();
    expect(formatDangNhapLabel(people.slice(0, 1))).toBe("A đang nhập");
    expect(formatDangNhapLabel(people.slice(0, 2))).toBe("A, B đang nhập");
    expect(formatDangNhapLabel(people)).toBe("Có 3 người đang nhập");
  });
});

describe("ảnh thu nhỏ", () => {
  it("xin gấp mật độ điểm ảnh, kẹp trong 64–1600", () => {
    expect(getThumbnailSize(240, 3)).toBe(720);
    expect(getThumbnailSize(240, 2)).toBe(480);
    expect(getThumbnailSize(20, 1)).toBe(64);
    expect(getThumbnailSize(900, 3)).toBe(1600);
  });
});

describe("trả lời bình luận", () => {
  it("tóm tắt tin gốc 1 dòng; không có nội dung thì 📎 tên file", () => {
    expect(getReplyPreview("dòng 1\n  dòng 2 ", "abc.jpg")).toBe("dòng 1 dòng 2");
    expect(getReplyPreview(null, "abc.jpg")).toBe("📎 abc.jpg");
    expect(getReplyPreview("   ", "abc.jpg")).toBe("📎 abc.jpg");
    expect(getReplyPreview(null, null)).toBe("");
  });
});

describe("thu hồi bình luận", () => {
  const goc: WorkflowComment = {
    ...binhLuan(5, "2026-10-22T09:00:00"),
    iD_File: 7791,
    tenFile: "abc.jpg",
    fileSize: 892,
  };
  const traLoi: WorkflowComment = {
    ...binhLuan(6, "2026-10-22T09:05:00", 203),
    iD_TraLoi: 5,
    traLoi_Ten: "Nhân viên Test 2",
    traLoi_NoiDung: "bình luận 5",
    traLoi_TenFile: "abc.jpg",
  };
  const items = [goc, traLoi, binhLuan(7, "2026-10-22T09:10:00")];

  it("tin bị thu hồi mất nội dung + file; tin trả lời nó ghi trích dẫn đã thu hồi", () => {
    const next = applyThuHoi(items, 5);
    expect(next[0]).toMatchObject({
      isThuHoi: true,
      noiDung: null,
      iD_File: null,
      tenFile: null,
      fileSize: null,
    });
    expect(next[1]).toMatchObject({
      traLoi_ThuHoi: true,
      traLoi_NoiDung: null,
      traLoi_TenFile: null,
      noiDung: "bình luận 6",
    });
    expect(next[2]).toBe(items[2]);
  });

  it("id lạ hoặc đã thu hồi rồi (nhận lại sự kiện) thì giữ nguyên mảng", () => {
    expect(applyThuHoi(items, 99)).toBe(items);
    const once = applyThuHoi(items, 5);
    expect(applyThuHoi(once, 5)).toBe(once);
  });
});
