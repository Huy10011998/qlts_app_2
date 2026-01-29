// Loại dữ liệu điều kiện
export type Conditions = {
  property: string;
  operator: number;
  value: string;
  type: number;
};

// Loại dữ liệu Field từ API
export interface Field {
  id: number;
  iD_Class: number;
  iD_Class_Name: string;
  name: string;
  moTa: string;
  isShowGrid: boolean;
  isUnique: boolean;
  isRequired: boolean;
  isActive: boolean;
  typeProperty: number;
  typeProperty_MoTa: number;
  maxLength: number;
  maxValue: number;
  minValue: number;
  referenceName: string;
  referenceNameMulti: string;
  referenceProperty: string;
  isMulti: boolean;
  stt: number;
  columnSize: number;
  columnNone: number;
  cascadeClearFields: string;
  parentsFields: string;
  groupLayout: string;
  isShowDetail: boolean;
  enumName: string;
  prefix: string;
  defaultValue: string;
  defaultDateNow: boolean;
  width: string;
  isReadOnly: boolean;
  stT_Grid: number;
  notShowReference: boolean;
  notShowSplit: boolean;
  isShowMobile: boolean;
  defaultTimeNow: boolean;
  tooltip: string;
}

// Loại dữ liệu Menu hoặc danh mục
export interface Item {
  id: string | number;
  label: string;
  parent: string | number | null;
  typeGroup: number;
  children: Item[];
  contentName_Mobile: string | null;
  stt: string | number;
  isReport: boolean;
}

// Dữ liệu người dùng cơ bản
export interface User {
  moTa?: string;
  email?: string;
  donVi?: string;
  phongBan?: string;
  boPhan?: string;
  toNhom?: string;
  chucVu?: string;
  chucDanh?: string;
  avatarUrl?: string;
}

// Thông tin người dùng rút gọn
export interface UserInfo {
  userName?: string;
  moTa?: string;
  avatarUrl?: string;
}

export type FileItem = Record<string, any>;

export type TreeNode = {
  index: number;
  parent: number | null;
  text: string;
  value: string;
  property: string;
  icon?: string | null;
  expanded: boolean;
  children?: TreeNode[];
};

export interface Emum {
  value?: number;
  text?: string;
}

export interface RefResponse {
  data?: {
    items?: { id: number; text: string; typeMulti?: any }[];
  };
}

// ---------- fetch enum & reference ----------
export interface FetchEnumResponse {
  data: any[];
  [key: string]: any;
}

export type SetEnumDataFn = (prev: Record<string, any>) => Record<string, any>;
