import { Field, Item } from "./Model.d";

export interface GetMenuActiveResponse {
  data: Item[];
  success?: boolean;
  message?: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
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
  fields(fields: any): Field;
  iconMobile: string;
  isBuildTree: boolean;
}

export interface MenuItemResponse {
  id: string;
  name: string;
  label: string;
  icon: string;
  propertyReference: string;
  moTa: string;
}
