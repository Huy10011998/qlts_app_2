import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { buildClassPermissionKey } from "../src/hooks/shared/permissionHelpers";
import { useNoiDiaTuLanhPermissions } from "../src/screens/NoiDia/shared/useNoiDiaTuLanhPermissions";
import {
  TRUNG_CHUYEN_NAME_CLASS,
  XAC_NHAN_VI_TRI_NAME_CLASS,
} from "../src/services/data/noiDiaApi";

let mockPermissions: string[] = [];

// Chỉ giả lập kho quyền; `usePermissionState`, `buildClassPermissionKey`,
// `normalizeClassName` và `hasPermissionKey` đều chạy thật — nếu không thì test
// này không còn kiểm được chuỗi khoá, thứ duy nhất nó sinh ra để giữ.
jest.mock("react-redux", () => ({
  useSelector: (selector: (state: any) => unknown) =>
    selector({ permission: { permissions: mockPermissions, loaded: true } }),
}));

jest.mock("../src/utils/Logger", () => ({
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
}));

/**
 * Chép đúng chuỗi web admin đang hiện ở màn phân quyền. Đây là bản sao của giao
 * diện đó: sửa một bên mà quên bên kia thì test đỏ ngay.
 */
const WEB_PERMISSION_KEYS = {
  xacNhanViTri: {
    read: "Class.XacNhanViTri_TuLanh.Read",
    insert: "Class.XacNhanViTri_TuLanh.Insert",
    update: "Class.XacNhanViTri_TuLanh.Update",
    delete: "Class.XacNhanViTri_TuLanh.Delete",
    attachFile: "Class.XacNhanViTri_TuLanh.AttachFile",
  },
  trungChuyen: {
    read: "Class.TrungChuyen_TuLanh.Read",
    insert: "Class.TrungChuyen_TuLanh.Insert",
    update: "Class.TrungChuyen_TuLanh.Update",
    delete: "Class.TrungChuyen_TuLanh.Delete",
    attachFile: "Class.TrungChuyen_TuLanh.AttachFile",
  },
} as const;

const mountHook = () => {
  let latest: ReturnType<typeof useNoiDiaTuLanhPermissions> | undefined;

  function Harness() {
    latest = useNoiDiaTuLanhPermissions();
    return null;
  }

  ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<Harness />);
  });

  return latest!;
};

beforeEach(() => {
  mockPermissions = [];
});

/**
 * Khoá quyền được ghép từ ba mảnh — hằng tên class, `normalizeClassName` (có bốn
 * nhánh rẽ), và tiền tố `Class.`. Lệch một mảnh là hỏng theo kiểu fail-closed:
 * không báo lỗi gì, chỉ là thao tác biến mất khỏi màn hình và không ai hiểu vì sao.
 */
describe("khoá quyền tủ lạnh nội địa khớp web admin", () => {
  it("sinh đúng chuỗi web đang dùng, cho mọi động từ", () => {
    const cases: Array<[string, string, string]> = [
      [XAC_NHAN_VI_TRI_NAME_CLASS, "Read", WEB_PERMISSION_KEYS.xacNhanViTri.read],
      [
        XAC_NHAN_VI_TRI_NAME_CLASS,
        "Insert",
        WEB_PERMISSION_KEYS.xacNhanViTri.insert,
      ],
      // Ba động từ dưới app chưa dùng (hai màn lịch sử không có sửa/xoá/đính kèm),
      // nhưng khoá được cho vào đây để lúc cần chỉ việc gọi `can`, không phải đoán
      // lại dạng chuỗi.
      [
        XAC_NHAN_VI_TRI_NAME_CLASS,
        "Update",
        WEB_PERMISSION_KEYS.xacNhanViTri.update,
      ],
      [
        XAC_NHAN_VI_TRI_NAME_CLASS,
        "Delete",
        WEB_PERMISSION_KEYS.xacNhanViTri.delete,
      ],
      [
        XAC_NHAN_VI_TRI_NAME_CLASS,
        "AttachFile",
        WEB_PERMISSION_KEYS.xacNhanViTri.attachFile,
      ],
      [TRUNG_CHUYEN_NAME_CLASS, "Read", WEB_PERMISSION_KEYS.trungChuyen.read],
      [TRUNG_CHUYEN_NAME_CLASS, "Insert", WEB_PERMISSION_KEYS.trungChuyen.insert],
      [TRUNG_CHUYEN_NAME_CLASS, "Update", WEB_PERMISSION_KEYS.trungChuyen.update],
      [TRUNG_CHUYEN_NAME_CLASS, "Delete", WEB_PERMISSION_KEYS.trungChuyen.delete],
      [
        TRUNG_CHUYEN_NAME_CLASS,
        "AttachFile",
        WEB_PERMISSION_KEYS.trungChuyen.attachFile,
      ],
    ];

    for (const [nameClass, action, webKey] of cases) {
      // App so sánh không phân biệt hoa thường, nên khoá sinh ra là bản thường hoá
      // của đúng chuỗi web.
      expect(buildClassPermissionKey(nameClass, action)).toBe(
        webKey.toLowerCase(),
      );
    }
  });

  it("nhận đúng quyền server trả về nguyên dạng của web", () => {
    mockPermissions = [
      WEB_PERMISSION_KEYS.xacNhanViTri.read,
      WEB_PERMISSION_KEYS.xacNhanViTri.insert,
      WEB_PERMISSION_KEYS.trungChuyen.read,
      WEB_PERMISSION_KEYS.trungChuyen.insert,
    ];

    expect(mountHook()).toMatchObject({
      canXemXacNhanViTri: true,
      canThemXacNhanViTri: true,
      canXemTrungChuyen: true,
      canThemTrungChuyen: true,
    });
  });

  // Ca đã làm lọt cửa `Insert` khi bỏ qua màn lịch sử để vào thẳng form.
  it("chỉ tick Xem thì không được Thêm", () => {
    mockPermissions = [
      WEB_PERMISSION_KEYS.xacNhanViTri.read,
      WEB_PERMISSION_KEYS.trungChuyen.read,
    ];

    expect(mountHook()).toMatchObject({
      canXemXacNhanViTri: true,
      canThemXacNhanViTri: false,
      canXemTrungChuyen: true,
      canThemTrungChuyen: false,
    });
  });

  // Hai nghiệp vụ tách quyền riêng: tick class này không mở class kia.
  it("quyền của hai nghiệp vụ không lây sang nhau", () => {
    mockPermissions = [WEB_PERMISSION_KEYS.trungChuyen.insert];

    expect(mountHook()).toMatchObject({
      canXemXacNhanViTri: false,
      canThemXacNhanViTri: false,
      canXemTrungChuyen: false,
      canThemTrungChuyen: true,
    });
  });

  it("không tick gì thì không có quyền nào", () => {
    expect(mountHook()).toMatchObject({
      canXemXacNhanViTri: false,
      canThemXacNhanViTri: false,
      canXemTrungChuyen: false,
      canThemTrungChuyen: false,
    });
  });

  // Quyền của class khác, chỉ khác phần đuôi — không được nhận nhầm.
  it("không nhận nhầm quyền của class trùng một phần tên", () => {
    mockPermissions = [
      "Class.XacNhanViTri_TuLanhCu.Insert",
      "Class.TrungChuyen_TaiSan.Insert",
    ];

    expect(mountHook()).toMatchObject({
      canThemXacNhanViTri: false,
      canThemTrungChuyen: false,
    });
  });

  it("nhóm toàn quyền mở hết, không cần tick từng dòng", () => {
    mockPermissions = ["Group.1"];

    expect(mountHook()).toMatchObject({
      canXemXacNhanViTri: true,
      canThemXacNhanViTri: true,
      canXemTrungChuyen: true,
      canThemTrungChuyen: true,
    });
  });
});
