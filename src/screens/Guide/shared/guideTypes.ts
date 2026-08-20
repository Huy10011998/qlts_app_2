import type { ImageSourcePropType } from "react-native";

/**
 * Mô hình nội dung của tài liệu hướng dẫn sử dụng.
 *
 * Nội dung là data module trong app (xem `guideContent.ts`) chứ không phải file
 * .md/.html: `metro.config.js` là bản mặc định nên hai đuôi đó không bundle được
 * thành asset, và tài liệu phải đọc được khi không có mạng nội bộ.
 */

export type GuideTopicId =
  | "dang-nhap"
  | "tong-quan"
  | "trang-chu"
  | "quet-qr"
  | "tai-san"
  | "xac-nhan-tu-lanh"
  | "trung-chuyen-tu-lanh"
  | "camera"
  | "bao-cao"
  | "phuong-tien"
  | "dai-hoi-co-dong"
  | "cai-dat"
  | "faq";

/** Nhóm chủ đề, hiện thành từng thẻ trên màn danh sách. */
export type GuideGroup =
  | "Bắt đầu"
  | "Nghiệp vụ"
  | "Theo dõi & báo cáo"
  | "Trợ giúp";

export const GUIDE_GROUP_ORDER: GuideGroup[] = [
  "Bắt đầu",
  "Nghiệp vụ",
  "Theo dõi & báo cáo",
  "Trợ giúp",
];

export type GuideBlock =
  | { kind: "paragraph"; text: string }
  /** Các bước có thứ tự, tự đánh số 1..n khi render. */
  | { kind: "steps"; items: string[] }
  | { kind: "bullets"; items: string[] }
  /** Khối nhấn: `info` là mẹo, `warn` là việc làm rồi không quay lại được. */
  | { kind: "note"; tone: "info" | "warn"; text: string }
  | {
      kind: "image";
      source: ImageSourcePropType;
      caption?: string;
      /** width / height. Mặc định 0.5 cho ảnh chụp dọc điện thoại. */
      aspectRatio?: number;
    };

export type GuideSection = {
  id: string;
  heading: string;
  blocks: GuideBlock[];
};

export type GuideTopic = {
  id: GuideTopicId;
  title: string;
  /** Một dòng, hiện dưới tên chủ đề ở màn danh sách. */
  summary: string;
  iconName: string;
  lib?: "ionicons" | "material-community";
  /** Màu ô icon — lấy từ `C` trong utils/helpers/colors. */
  iconBg: string;
  group: GuideGroup;
  /** Từ khoá phụ cho ô tìm kiếm (tên gọi khác, cách gõ khác). */
  keywords?: string[];
  /** Mỗi section là một câu hỏi gập/mở được. Dùng cho chủ đề FAQ. */
  collapsibleSections?: boolean;
  sections: GuideSection[];
};
