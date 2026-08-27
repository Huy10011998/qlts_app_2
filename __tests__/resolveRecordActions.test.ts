import {
  pickPrimaryRecordAction,
  resolveRecordActions,
} from "../src/components/assets/detailActions/recordActions/resolveRecordActions";
import {
  FRIDGE_TRUNG_CHUYEN_KIND,
  FRIDGE_XAC_NHAN_VI_TRI_KIND,
} from "../src/constants/recordActionKinds";

jest.mock("../src/utils/Logger", () => ({
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
}));

const child = (name: string, moTa: string) =>
  ({
    id: name,
    name,
    moTa,
    label: moTa,
    propertyReference: "iD_Cha",
  }) as any;

const FIRE_EXTINGUISHER = { id: 7, Ma: "BCC-014" };

// `toFridgeSummary` đọc field theo tên không phân biệt dạng key và đòi `id` là số
// dương — thiếu thì trả null và hành động tủ lạnh biến mất.
const FRIDGE = { id: 31, ma: "TL-031", ten: "Tủ 200L" };

const allowAll = () => true;

const makeCtx = (overrides: Record<string, any> = {}) => ({
  can: allowAll,
  item: FIRE_EXTINGUISHER,
  loadChildClasses: async () => [] as any[],
  nameClass: "BinhChuaChay",
  navigate: jest.fn(),
  openAddForm: jest.fn(),
  ...overrides,
});

describe("gộp việc làm được với một bản ghi", () => {
  it("bảng con server thành hành động, không cần khai báo gì trong app", async () => {
    const { actions, childClassesFailed } = await resolveRecordActions(
      makeCtx({
        loadChildClasses: async () => [
          // Class chưa tồn tại hôm nay: BE trả về là thành một việc dùng được
          // ngay, app không phải khai gì trước.
          child("KiemKe_BinhChuaChay", "Kiểm kê bình chữa cháy"),
          child("DanhGia_BinhChuaChay", "Đánh giá bình chữa cháy"),
        ],
      }),
    );

    expect(childClassesFailed).toBe(false);
    // Giữ nguyên thứ tự server trả về; nhãn suy từ moTa của chính class con.
    expect(actions.map((a) => [a.kind, a.label])).toEqual([
      ["child:kiemke", "Thêm kiểm kê bình chữa cháy"],
      ["child:danhgia", "Đánh giá"],
    ]);
  });

  it("class con lạ lấy nhãn từ moTa của class", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        loadChildClasses: async () => [child("BaoTri_BinhChuaChay", "Bảo trì")],
      }),
    );

    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe("child:baotri");
    expect(actions[0].label).toBe("Thêm bảo trì");
  });

  it("lọc theo quyền Insert của từng class con", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        can: (nameClass: string, action: string) =>
          action === "Insert" && nameClass === "BaoTri_BinhChuaChay",
        loadChildClasses: async () => [
          child("DanhGia_BinhChuaChay", "Đánh giá"),
          child("BaoTri_BinhChuaChay", "Bảo trì"),
        ],
      }),
    );

    expect(actions.map((a) => a.key)).toEqual(["child:BaoTri_BinhChuaChay"]);
  });

  // Mạng lỗi khi tải danh mục con thì việc có màn riêng vẫn phải dùng được —
  // nên nơi gọi cần phân biệt "chưa đủ" với "không có".
  it("tải danh mục con lỗi vẫn giữ được việc của tủ lạnh", async () => {
    const { actions, childClassesFailed } = await resolveRecordActions(
      makeCtx({
        item: FRIDGE,
        nameClass: "NoiDia_TuLanh",
        loadChildClasses: async () => {
          throw new Error("offline");
        },
      }),
    );

    expect(childClassesFailed).toBe(true);
    expect(actions.map((a) => a.kind)).toEqual([
      FRIDGE_XAC_NHAN_VI_TRI_KIND,
      FRIDGE_TRUNG_CHUYEN_KIND,
    ]);
  });

  // `Read` đủ để thấy việc và mở màn lịch sử; vào THẲNG form là tạo mới nên phải
  // có `Insert`. Cửa `Insert` vốn nằm ở nút thêm trên màn lịch sử, mà màn form
  // không tự kiểm quyền — bỏ qua màn lịch sử là bỏ luôn cửa đó.
  it("chỉ có quyền xem thì việc tủ lạnh vẫn hiện nhưng không quét liên tục được", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        can: (_nameClass: string, action: string) => action === "Read",
        item: FRIDGE,
        nameClass: "NoiDia_TuLanh",
      }),
    );

    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.canQuickRun === false)).toBe(true);
  });

  it("có quyền thêm thì quét liên tục được", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        can: (nameClass: string, action: string) =>
          action === "Read" ||
          (action === "Insert" && nameClass === "TrungChuyen_TuLanh"),
        item: FRIDGE,
        nameClass: "NoiDia_TuLanh",
      }),
    );

    const byKind = Object.fromEntries(
      actions.map((a) => [a.kind, a.canQuickRun]),
    );

    expect(byKind).toEqual({
      [FRIDGE_XAC_NHAN_VI_TRI_KIND]: false,
      [FRIDGE_TRUNG_CHUYEN_KIND]: true,
    });
  });

  // Bản ghi con: danh sách đã lọc `Insert` của chính class con rồi, và cả hai
  // đường đều mở cùng một màn tạo.
  it("bản ghi con đã qua cửa Insert nên quét liên tục được", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        loadChildClasses: async () => [
          child("DanhGia_BinhChuaChay", "Đánh giá"),
        ],
      }),
    );

    expect(actions[0].canQuickRun).toBe(true);
  });

  // Quyền của nghiệp vụ tủ lạnh nằm ở class khác class bản ghi.
  it("việc tủ lạnh kiểm quyền trên class nghiệp vụ, không phải NoiDia_TuLanh", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({
        can: (nameClass: string, action: string) =>
          nameClass === "TrungChuyen_TuLanh" && action === "Read",
        item: FRIDGE,
        nameClass: "NoiDia_TuLanh",
      }),
    );

    expect(actions.map((a) => a.kind)).toEqual([FRIDGE_TRUNG_CHUYEN_KIND]);
  });

  it("không phải tủ lạnh thì không có việc tủ lạnh", async () => {
    const { actions } = await resolveRecordActions(makeCtx());

    expect(actions).toHaveLength(0);
  });

  it("bản ghi tủ lạnh thiếu id thì bỏ hẳn việc tủ lạnh", async () => {
    const { actions } = await resolveRecordActions(
      makeCtx({ item: { ma: "TL-031" }, nameClass: "NoiDia_TuLanh" }),
    );

    expect(actions).toHaveLength(0);
  });

  // Hai đích: bấm từ màn chi tiết mở lịch sử, quét liên tục vào thẳng form.
  it("việc tủ lạnh có hai đích tuỳ quét liên tục hay không", async () => {
    const navigate = jest.fn();
    const { actions } = await resolveRecordActions(
      makeCtx({ item: FRIDGE, nameClass: "NoiDia_TuLanh", navigate }),
    );
    const xacNhan = actions.find(
      (a) => a.kind === FRIDGE_XAC_NHAN_VI_TRI_KIND,
    )!;

    await xacNhan.run({ quick: false });
    expect(navigate).toHaveBeenLastCalledWith(
      "XacNhanViTriTuLanhLichSu",
      expect.objectContaining({ fridge: expect.objectContaining({ id: 31 }) }),
    );

    await xacNhan.run({ quick: true });
    expect(navigate).toHaveBeenLastCalledWith(
      "XacNhanViTriTuLanhForm",
      expect.objectContaining({ fridge: expect.objectContaining({ id: 31 }) }),
    );
  });

  // Quét liên tục thì lưu xong phải về máy quét, không dừng ở danh sách nào.
  it("bản ghi con lưu xong về máy quét khi đang quét liên tục", async () => {
    const openAddForm = jest.fn();
    const { actions } = await resolveRecordActions(
      makeCtx({
        loadChildClasses: async () => [child("KiemKe_BinhChuaChay", "Kiểm kê")],
        openAddForm,
        returnTo: "openAssetRelatedList",
      }),
    );

    await actions[0].run({ quick: false });
    expect(openAddForm).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnTo: "openAssetRelatedList" }),
    );

    await actions[0].run({ quick: true });
    expect(openAddForm).toHaveBeenLastCalledWith(
      expect.objectContaining({ returnTo: "qrScan" }),
    );
  });

  it("đường xem lại chỉ có khi biết màn danh sách của luồng", async () => {
    const withList = await resolveRecordActions(
      makeCtx({
        listRoute: "QrReview",
        loadChildClasses: async () => [child("KiemKe_BinhChuaChay", "Kiểm kê")],
      }),
    );
    const withoutList = await resolveRecordActions(
      makeCtx({
        loadChildClasses: async () => [child("KiemKe_BinhChuaChay", "Kiểm kê")],
      }),
    );

    expect(withList.actions[0].review?.count).toEqual({
      idRoot: "7",
      nameClass: "KiemKe_BinhChuaChay",
      propertyReference: "iD_Cha",
    });
    // Màn quét không cần đường xem lại nên không truyền `listRoute`.
    expect(withoutList.actions[0].review).toBeUndefined();
  });
});

describe("chọn việc chính", () => {
  const danhGia = { key: "a", kind: "child:danhgia", group: "work" } as any;
  const trungChuyen = {
    key: "b",
    kind: FRIDGE_TRUNG_CHUYEN_KIND,
    group: "work",
  } as any;
  const admin = { key: "d", kind: "child:danhgia", group: "admin" } as any;

  // Đang đi kiểm kê thì nút chính của mọi thiết bị nên là Kiểm kê, dù bảng ưu
  // tiên xếp đánh giá trước.
  // Bỏ mọi bảng ưu tiên: nhiều việc thì mở bảng chọn, không đoán bừa một việc
  // rồi để người dùng bấm nhầm.
  it("nhiều việc thì không đoán bừa", () => {
    expect(pickPrimaryRecordAction([danhGia, trungChuyen])).toBeNull();
  });

  it("chỉ có một việc thì đó là nút chính", () => {
    expect(pickPrimaryRecordAction([danhGia])).toBe(danhGia);
  });

  it("bỏ qua nhóm admin và việc chạy tại chỗ", () => {
    expect(pickPrimaryRecordAction([admin])).toBeNull();
    expect(
      pickPrimaryRecordAction([{ ...danhGia, inPlace: true }]),
    ).toBeNull();
    expect(pickPrimaryRecordAction([])).toBeNull();
  });
});
