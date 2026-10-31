import { getMatchedKey } from "../../../utils/helpers/field";
import { AppColors } from "../../../utils/helpers/colors";
import type {
  AttendanceFilter,
  AttendanceStatus,
  Shareholder,
  ShareholderApiItem,
} from "../../../types/index";
import { removeVietnameseTones } from "../../../utils/helpers/string";

export type VotingChoice = "agree" | "disagree" | "noOpinion";

export type MeetingOpinionApiItem = Record<string, any> & {
  id?: number | string;
};

export type MeetingOpinion = {
  id: string;
  code: string;
  title: string;
  description: string;
};

export type GetListResponse<T> = {
  message?: string;
  data?: {
    items?: T[] | null;
    totalCount?: number;
  } | null;
};

export const mapShareholderItem = (item: ShareholderApiItem): Shareholder => ({
  id: String(item.id),
  name: item.tenCoDong || "Không rõ tên",
  shareholderId: item.maCoDong || "--",
  shares: Number(item.tongCoPhan || 0),
  status: item.isDiemDanh ? "present" : "pending",
  isLock: item.isLock === true,
});

export const getCandidateValue = (
  item: MeetingOpinionApiItem,
  candidates: string[],
): string => {
  for (const candidate of candidates) {
    const key = getMatchedKey(item, candidate);
    const value = key ? item[key] : undefined;

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

export const mapOpinionItem = (item: MeetingOpinionApiItem): MeetingOpinion => {
  const title =
    getCandidateValue(item, [
      "ten",
      "tenYKien",
      "noiDung",
      "tieuDe",
      "title",
      "tenNghiQuyet",
    ]) || "Ý kiến chưa đặt tên";

  return {
    id: String(item.id ?? ""),
    code: getCandidateValue(item, [
      "ma",
      "maYKien",
      "code",
      "soHieu",
      "maNghiQuyet",
    ]),
    title,
    description: getCandidateValue(item, [
      "moTa",
      "dienGiai",
      "description",
      "ghiChu",
      "noiDungChiTiet",
    ]),
  };
};

export const makeStatusConfig = (
  c: AppColors,
): Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; border: string }
> => ({
  present: {
    label: "Đã điểm danh",
    color: c.green,
    bg: c.greenLight,
    border: c.greenBorder,
  },
  pending: {
    label: "Chưa điểm danh",
    color: c.slate,
    bg: c.slateLight,
    border: c.slateBorder,
  },
});

/**
 * Màu vòng chữ cái đầu tên: sáu tông dịu xoay vòng theo tên (cùng tên luôn cùng
 * màu), thay cho một màu chung cho cả danh sách 220 người.
 */
export const getAvatarTone = (
  name: string,
  c: AppColors,
): { bg: string; fg: string } => {
  const tones = [
    { bg: c.indigoSurface, fg: c.blue },
    { bg: c.tealSurface, fg: c.emerald },
    { bg: c.orangeSurface, fg: c.amber },
    { bg: c.pinkSurface, fg: c.rose },
    { bg: c.blueSurface, fg: c.sky },
    { bg: c.violetSurface, fg: c.violet },
  ];
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  return tones[hash % tones.length];
};

export const makeVotingOptions = (
  c: AppColors,
): Array<{
  key: VotingChoice;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}> => [
  {
    key: "agree",
    label: "Tán thành",
    description: "Ghi nhận cổ đông đồng ý với ý kiến đã chọn.",
    color: c.green,
    bg: c.greenLight,
    border: c.greenBorder,
    icon: "check-circle-outline",
  },
  {
    key: "disagree",
    label: "Không tán thành",
    description: "Ghi nhận cổ đông không đồng ý với ý kiến đã chọn.",
    color: c.red,
    bg: c.redSurface,
    border: c.redBorder,
    icon: "close-circle-outline",
  },
  {
    key: "noOpinion",
    label: "Không có ý kiến",
    description: "Ghi nhận cổ đông không đưa ra ý kiến.",
    color: c.slate,
    bg: c.slateLight,
    border: c.slateBorder,
    icon: "minus-circle-outline",
  },
];

export const VOTING_CHOICE_LABEL_MAP: Record<VotingChoice, string> = {
  agree: "Tán thành",
  disagree: "Không tán thành",
  noOpinion: "Không có ý kiến",
};

export const VOTING_CHOICE_VALUE_MAP: Record<VotingChoice, string> = {
  agree: "1",
  disagree: "0",
  noOpinion: "2",
};

export const filterMeetingOpinions = (
  opinions: MeetingOpinion[],
  opinionSearchQuery: string,
) => {
  const keyword = removeVietnameseTones(opinionSearchQuery.trim());

  if (!keyword) return opinions;

  return opinions.filter((item) => {
    const title = removeVietnameseTones(item.title);
    const code = removeVietnameseTones(item.code);
    const description = removeVietnameseTones(item.description);

    return (
      title.includes(keyword) ||
      code.includes(keyword) ||
      description.includes(keyword)
    );
  });
};

/**
 * Tên đại hội đưa lên dòng phụ dưới tiêu đề "Đại hội cổ đông" của header: bỏ phần
 * đầu trùng tiêu đề để vừa một dòng — "Đại hội cổ đông" + "THƯỜNG NIÊN NĂM 2027"
 * đọc liền thành tên đầy đủ. Tên không bắt đầu như vậy thì giữ nguyên.
 */
export const getMeetingHeaderLabel = (name?: string | null) => {
  const fullName = (name ?? "").trim();
  const rest = fullName
    .replace(/^đại\s+hội\s+(đồng\s+)?cổ\s+đông\s*/i, "")
    .trim();

  return rest || fullName;
};

/**
 * Số người và số cổ phần đã có mặt. Đại hội được tiến hành khi cổ đông dự họp
 * đại diện TRÊN 50% tổng số phiếu biểu quyết (Luật Doanh nghiệp 2020, Điều 145)
 * — tính theo cổ phần chứ không theo đầu người, nên `hasQuorum` dùng
 * `presentShares`. Cả danh sách cổ đông được tải một lần nên cộng ở app được.
 */
export const getAttendanceSummary = (shareholders: Shareholder[]) => {
  let presentCount = 0;
  let pendingCount = 0;
  let presentShares = 0;
  let totalShares = 0;

  for (const item of shareholders) {
    const shares = Number.isFinite(item.shares) ? item.shares : 0;
    totalShares += shares;

    if (item.status === "present") {
      presentCount += 1;
      presentShares += shares;
    } else if (item.status === "pending") {
      pendingCount += 1;
    }
  }

  return {
    hasQuorum: totalShares > 0 && presentShares * 2 > totalShares,
    pendingCount,
    presentCount,
    presentShares,
    sharePercent: totalShares > 0 ? (presentShares / totalShares) * 100 : 0,
    totalShares,
  };
};

/**
 * Số cổ phần kiểu vi-VN: 2430000 → "2.430.000". Tự chèn dấu chấm thay vì
 * toLocaleString để không phụ thuộc Intl có trong Hermes hay không.
 */
export const formatShares = (value: number) =>
  String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/**
 * Chữ trong vòng ảnh đại diện: chữ đầu của TÊN (từ cuối), "Trần Thị Bích Ngọc"
 * → "N". Lấy chữ đầu của họ thì danh sách xếp theo họ ra cả chục dòng liền
 * cùng một chữ.
 */
export const getShareholderInitial = (name: string) => {
  const words = name.trim().split(/\s+/);

  return (words[words.length - 1] || "?").charAt(0).toUpperCase();
};

/** Tên nội dung kèm mã cho màn quét: "NQ.03 - Tăng cổ tức". */
export const getOpinionDisplayTitle = (
  opinion: Pick<MeetingOpinion, "code" | "title">,
) => (opinion.code ? `${opinion.code} - ${opinion.title}` : opinion.title);

/**
 * Nội dung hộp xác nhận của màn quét: đủ tên, mã, số cổ phần để nhân viên đối
 * chiếu với người đứng trước mặt; chế độ lấy ý kiến thêm nội dung và phân loại
 * (viết hoa vì hộp thoại không tô màu được).
 */
export const getScanConfirmMessage = ({
  choice,
  opinionTitle,
  scanMode,
  shareholder,
}: {
  choice?: VotingChoice;
  opinionTitle?: string;
  scanMode: "attendance" | "voting";
  shareholder: Pick<Shareholder, "name" | "shareholderId" | "shares">;
}) => {
  const shares = formatShares(shareholder.shares);
  const lines = [
    `Cổ đông: ${shareholder.name}`,
    `Mã: ${shareholder.shareholderId} · ${shares} cổ phần`,
  ];

  if (scanMode === "voting") {
    const choiceLabel = choice
      ? VOTING_CHOICE_LABEL_MAP[choice].toUpperCase()
      : "";
    lines.push(
      `Nội dung: ${opinionTitle || "ý kiến đã chọn"}`,
      `Phân loại: ${choiceLabel}`,
    );
  }

  return lines.join("\n");
};

/** Nội dung hộp báo ghi thành công của màn quét. */
export const getScanSuccessMessage = ({
  choice,
  opinionTitle,
  scanMode,
  shareholder,
}: {
  choice?: VotingChoice;
  opinionTitle?: string;
  scanMode: "attendance" | "voting";
  shareholder: Pick<Shareholder, "name" | "shareholderId">;
}) => {
  const who = `${shareholder.name} (${shareholder.shareholderId})`;

  if (scanMode === "attendance") return `Đã điểm danh ${who}.`;

  const choiceLabel = choice
    ? VOTING_CHOICE_LABEL_MAP[choice].toUpperCase()
    : "ý kiến";

  return [
    `Đã ghi ${choiceLabel} cho ${who}.`,
    `Nội dung: ${opinionTitle || "ý kiến đã chọn"}`,
  ].join("\n");
};

/** Cổ đông là tổ chức thì ảnh đại diện là icon toà nhà thay cho chữ cái. */
export const isOrganizationShareholder = (name: string) =>
  /^((tong\s+)?cong\s+ty|cty|ngan\s+hang|quy\s)/.test(
    removeVietnameseTones(name.trim()),
  );

export const filterShareholders = (
  shareholders: Shareholder[],
  searchQuery: string,
  attendanceFilter: AttendanceFilter,
) => {
  const keyword = removeVietnameseTones(searchQuery.trim());

  return shareholders.filter((item) => {
    const normalizedName = removeVietnameseTones(item.name);
    const normalizedCode = removeVietnameseTones(item.shareholderId);
    const matchesSearch =
      !keyword ||
      normalizedName.includes(keyword) ||
      normalizedCode.includes(keyword);

    if (!matchesSearch) return false;

    switch (attendanceFilter) {
      case "presentOrProxy":
        return item.status === "present";
      case "pending":
        return item.status === "pending";
      case "all":
      default:
        return true;
    }
  });
};
