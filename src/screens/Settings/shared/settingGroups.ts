import { C } from "../../../utils/helpers/colors";

/**
 * Các nhóm của màn Cài đặt, đúng thứ tự hiện trên màn chính. Mỗi nhóm mở một
 * màn riêng (`SettingGroup`) chứa các dòng cài đặt của nó.
 */
export type SettingGroupId = "account" | "support" | "system" | "appInfo" | "other";

export type SettingGroupConfig = {
  id: SettingGroupId;
  title: string;
  iconName: string;
  iconBg: string;
};

export const SETTING_GROUPS: readonly SettingGroupConfig[] = [
  {
    id: "account",
    title: "Tài khoản",
    iconName: "person-circle-outline",
    iconBg: C.blue,
  },
  {
    id: "support",
    title: "Hỗ trợ",
    iconName: "help-buoy-outline",
    iconBg: C.emerald,
  },
  {
    id: "system",
    title: "Hệ thống",
    iconName: "shield-checkmark-outline",
    iconBg: C.sky,
  },
  {
    id: "appInfo",
    title: "Thông tin ứng dụng",
    iconName: "information-circle-outline",
    iconBg: C.violet,
  },
  {
    id: "other",
    title: "Khác",
    iconName: "ellipsis-horizontal-circle-outline",
    iconBg: C.amber,
  },
];

const GROUP_BY_ID = new Map(SETTING_GROUPS.map((group) => [group.id, group]));

export const getSettingGroupTitle = (id: SettingGroupId | undefined) =>
  (id && GROUP_BY_ID.get(id)?.title) || "Cài đặt";

/** Màu của nhóm (ô icon trên màn chính) — card trong màn nhóm viền theo màu này. */
export const getSettingGroupColor = (id: SettingGroupId) =>
  GROUP_BY_ID.get(id)?.iconBg ?? C.red;
