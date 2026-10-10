import {
  CV_CONG_VIEC_NAME_CLASS,
  CV_KE_HOACH_NAME_CLASS,
} from "../../services/data/workflowApi";

/**
 * View Workflow là view VIẾT RIÊNG như Camera / ĐHCĐ: group trên web đặt
 * `isGroupWeb = 1` với Mã "Workflow" chỉ giữ chỗ (stt) cho ô trên Trang chủ,
 * còn danh sách chức năng do app tự vẽ ở màn Workflow.
 *
 * Quyền xem view: `View.Workflow`. Có quyền này thì tab Camera ở bottom cũng
 * đổi thành tab Lịch.
 */
export const WORKFLOW_VIEW_CODE = "Workflow";

export type WorkflowMenuRoute = "Flow" | "CongViec" | "KeHoach";

export type WorkflowMenuItem = {
  key: string;
  label: string;
  description: string;
  icon: string;
  /** Bảng nghiệp vụ — vừa là tên quyền (Class.{nameClass}.Read), vừa là `nameClass` của màn phiếu. */
  nameClass: string;
  route: WorkflowMenuRoute;
};

export type WorkflowMenuGroup = {
  key: string;
  title: string;
  items: WorkflowMenuItem[];
};

/**
 * Thêm một loại phiếu chạy quy trình mới (bảng flow mới): thêm một dòng vào
 * nhóm Flow, `nameClass` = tên bảng — màn phiếu dùng chung cho mọi flow.
 * Chỉ khác bước duyệt thì admin thêm "Loại quy trình" trên web, app không đổi.
 */
export const WORKFLOW_MENU_GROUPS: WorkflowMenuGroup[] = [
  {
    key: "flow",
    title: "Flow",
    items: [
      {
        key: "Ticket_PhongBan",
        label: "Ticket phòng ban",
        description: "Phiếu đề nghị theo quy trình duyệt",
        icon: "document-text-outline",
        nameClass: "Ticket_PhongBan",
        route: "Flow",
      },
    ],
  },
  {
    key: "congViec",
    title: "Công việc",
    items: [
      {
        key: CV_CONG_VIEC_NAME_CLASS,
        label: "Công việc",
        description: "Giao việc, theo dõi tiến độ",
        icon: "checkbox-outline",
        nameClass: CV_CONG_VIEC_NAME_CLASS,
        route: "CongViec",
      },
      {
        key: CV_KE_HOACH_NAME_CLASS,
        label: "Kế hoạch",
        description: "Gom công việc, theo dõi % hoàn thành",
        icon: "flag-outline",
        nameClass: CV_KE_HOACH_NAME_CLASS,
        route: "KeHoach",
      },
    ],
  },
];

/** Chỉ giữ chức năng có quyền xem; nhóm không còn chức năng nào thì ẩn. */
export const filterWorkflowMenu = (
  groups: WorkflowMenuGroup[],
  canRead: (nameClass: string) => boolean,
) =>
  groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canRead(item.nameClass)),
    }))
    .filter((group) => group.items.length > 0);
