import { getMatchedKey } from "../../../utils/helpers/field";
import { C } from "../../../utils/helpers/colors";
import {
  AttendanceFilter,
  AttendanceStatus,
  Shareholder,
  ShareholderApiItem,
} from "../../../types/Index";
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

export const statusConfig: Record<
  AttendanceStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  present: {
    label: "Đã điểm danh",
    color: C.green,
    bg: C.greenLight,
    border: C.greenBorder,
  },
  pending: {
    label: "Chưa điểm danh",
    color: C.slate,
    bg: C.slateLight,
    border: C.slateBorder,
  },
};

export const VOTING_OPTIONS: Array<{
  key: VotingChoice;
  label: string;
  description: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
}> = [
  {
    key: "agree",
    label: "Tán thành",
    description: "Ghi nhận cổ đông đồng ý với ý kiến đã chọn.",
    color: C.green,
    bg: C.greenLight,
    border: C.greenBorder,
    icon: "check-circle-outline",
  },
  {
    key: "disagree",
    label: "Không tán thành",
    description: "Ghi nhận cổ đông không đồng ý với ý kiến đã chọn.",
    color: C.red,
    bg: "#FFF1F2",
    border: C.redBorder,
    icon: "close-circle-outline",
  },
  {
    key: "noOpinion",
    label: "Không có ý kiến",
    description: "Ghi nhận cổ đông không đưa ra ý kiến.",
    color: C.slate,
    bg: C.slateLight,
    border: C.slateBorder,
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

export const getAttendanceSummary = (shareholders: Shareholder[]) => {
  const presentCount = shareholders.filter(
    (item) => item.status === "present",
  ).length;
  const pendingCount = shareholders.filter(
    (item) => item.status === "pending",
  ).length;
  const attendanceRate = shareholders.length
    ? Math.round((presentCount / shareholders.length) * 100)
    : 0;

  return {
    attendanceRate,
    pendingCount,
    presentCount,
  };
};

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
