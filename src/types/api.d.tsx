import { Field, Item } from "./model.d";

export interface GetMenuActiveResponse {
  data: Item[];
  success?: boolean;
  message?: string;
}

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

export interface GetViewActiveResponse {
  data: ViewActiveItem[];
  success?: boolean;
  message?: string;
}

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

export interface LoginResponse {
  refreshToken: null;
  accessToken: any;
  data: {
    accessToken: string;
    refreshToken?: string;
  };
}

export interface PropertyResponse {
  prefix: string | undefined;
  prentTuDongTang: string | undefined;
  formatTuDongTang: string | undefined;
  propertyTuDongTang: string | undefined;
  isTuDongTang: boolean | undefined;
  fields(fields: any): Field;
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
