import { ApiResponse, Field, Item } from "./model.d";

export type GetMenuActiveResponse = ApiResponse<Item[]>;

export interface ViewActiveItem {
  id: number;
  colorTheme_MoTa?: number | null;
  ma: string;
  label: string;
  stt?: number | null;
  href?: string | null;
  isActive?: boolean;
  colorTheme?: number | null;
  icon?: string | null;
  longLabel?: string | null;
  iconMobile?: string | null;
}

export type GetViewActiveResponse = ApiResponse<ViewActiveItem[]>;

export interface ChangePasswordResponse {
  success?: boolean;
  message?: string;
  data?:
    | number
    | {
        success?: boolean;
        message?: string;
      }
    | null;
}

export type LoginResponse = ApiResponse<{
  accessToken: string;
  refreshToken?: string;
}>;

export interface PropertyResponse {
  prefix: string | undefined;
  prentTuDongTang: string | undefined;
  formatTuDongTang: string | undefined;
  propertyTuDongTang: string | undefined;
  isTuDongTang: boolean | undefined;
  fields?: Field[];
  iconMobile: string;
  isBuildTree: boolean;
}

export interface MenuItemResponse {
  id: string;
  name: string;
  label: string;
  icon: string;
  iconImageUri?: string;
  iconMobile?: string | null;
  propertyReference: string;
  moTa: string;
}

export interface ShareholderApiItem {
  id: number;
  isDiemDanh?: boolean;
  isLock?: boolean | null;
  maCoDong?: string | null;
  tenCoDong?: string | null;
  tongCoPhan?: number | null;
  log_StartDate?: string | null;
  [key: string]: any;
}
