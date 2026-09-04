import type { RecordActionKind } from "../../../../constants/recordActionKinds";
import type { AssetReturnTo, Field } from "../../../../types";

export type RecordActionRunOptions = {
  /**
   * true = đang trong vòng quét liên tục.
   *
   * Nghiệp vụ có màn lịch sử riêng (tủ lạnh) thì `quick` bỏ qua lịch sử để vào
   * thẳng form: đang quét cái thứ 12 thì không ai muốn xem lại lịch sử. Việc tạo
   * bản ghi con thì hai đường trùng nhau.
   */
  quick: boolean;
};

/**
 * Một việc có thể làm với bản ghi đang mở.
 *
 * Gom ba loại rất khác nhau về một kiểu, để thanh hành động, menu ⋯ và chế độ
 * quét cùng đọc một nguồn:
 * - Bảng con server trả về (đánh giá, kiểm kê…) — động, không cần khai gì.
 * - Màn riêng viết trong app (trung chuyển tủ lạnh, xác nhận vị trí) — quyền nằm
 *   ở class nghiệp vụ khác class bản ghi.
 * - Việc chạy tại chỗ (cập nhật toạ độ) — không điều hướng, tự báo tiến độ.
 */
export type RecordAction = {
  /** Định danh ổn định, ví dụ "child:KiemKe_BinhChuaChay" hay "fridge:trung-chuyen". */
  key: string;
  /** Để chế độ quét khớp được; "other" thì không chọn làm chế độ. */
  kind: RecordActionKind;
  label: string;
  sublabel?: string;
  /** Tên icon Ionicons. */
  icon?: string;
  /**
   * `work` = làm việc với thiết bị, ra thanh hành động ở đáy màn.
   * `admin` = quản trị bản ghi (Bản sao, Xóa), ở menu ⋯.
   */
  group: "work" | "admin";
  /**
   * Chạy tại chỗ và tự báo tiến độ bằng nhãn: ở lại menu ⋯ (nơi cơ chế
   * `closeOnPress: false` đã có), không đưa ra thanh đáy, không làm chế độ quét
   * được — chạy từ màn quét thì không có màn nào để hiện tiến trình.
   */
  inPlace?: boolean;
  disabled?: boolean;
  tone?: "default" | "danger";
  /**
   * Có được chạy trong vòng quét liên tục hay không. Thiếu = được.
   *
   * KHÔNG trùng với "có được hiện ra": nghiệp vụ tủ lạnh chỉ cần quyền `Read` là
   * thấy và mở được màn lịch sử, nhưng `quick` đi thẳng vào form tạo nên phải có
   * `Insert`. Trước đây cửa `Insert` nằm ở nút thêm trên màn lịch sử — mà bản thân
   * màn form không kiểm quyền, nên bỏ qua màn lịch sử là bỏ luôn cửa đó.
   */
  canQuickRun?: boolean;
  /**
   * Việc chính khi bấm từ màn chi tiết. Tạo bản ghi con → mở màn tạo; nghiệp vụ
   * có màn lịch sử riêng → mở lịch sử (xem `RecordActionRunOptions.quick`).
   */
  run: (options: RecordActionRunOptions) => void | Promise<void>;
  /**
   * Đường xem lại, chỉ có khi "tạo mới" và "xem lại" là hai màn khác nhau — tức
   * là với bản ghi con. Nghiệp vụ tủ lạnh thì `run` đã mở lịch sử rồi nên không
   * có mục này.
   */
  review?: {
    label: string;
    /** Đủ ba tham số đầu thì thanh đáy đếm được và hiện kèm số bản ghi. */
    count?: {
      idRoot: string;
      nameClass: string;
      propertyReference: string;
      /** Class CHA — để lấy trọn bộ cặp parent-value, đếm đúng như danh sách. */
      nameClassRoot?: string;
    };
    run: () => void;
  };
};

/** Ngữ cảnh menu/quyền của luồng tài sản, đi kèm suốt các màn con. */
export type RecordActionAssetContext = {
  assetTitleHeader?: string;
  groupMenuId?: number;
  viewPermission?: string;
};

export type RecordActionBuilderContext = {
  assetContext?: RecordActionAssetContext;
  /** Field của class bản ghi, dùng để suy ra mã bản ghi. */
  fieldActive?: Field[];
  item: Record<string, any>;
  /**
   * Màn danh sách bản ghi con của luồng đang đứng — luồng QR có màn riêng. Thiếu
   * thì hành động không có đường "xem lại" (màn quét không cần đến).
   */
  listRoute?: "QrReview" | "AssetRelatedList";
  nameClass?: string;
  /**
   * Nơi màn tạo quay về sau khi lưu, cho lần bấm KHÔNG phải quét liên tục. Lúc
   * quét liên tục thì luôn về máy quét, không phụ thuộc giá trị này.
   */
  returnTo?: AssetReturnTo;
};
