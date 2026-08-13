export type LogoutReason = "EXPIRED" | "MANUAL" | "OTHER";

export type AuthContextType = {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  iosAuthenticated: boolean;
  authReady: boolean;

  setIosAuthenticated: (value: boolean) => void;
  setToken: (token: string | null) => Promise<void>;
  setRefreshToken: (token: string | null) => Promise<void>;
  syncSession: (
    accessToken: string | null,
    refreshToken?: string | null,
  ) => void;
  logout: (reason?: LogoutReason) => Promise<void>;

  logoutReason?: LogoutReason;
  clearLogoutReason: () => void;
};

// Payload của JWT
export interface JwtPayload {
  readonly exp: number;
}

// Context cho Header
export interface TabItem {
  key: string;
  label: string;
  icon: string;
  /**
   * Dấu hiệu "trong mục này có gì": số lượng khi đếm được (số tệp), hoặc "dot"
   * khi chỉ biết có nội dung mà không đếm được (ghi chú là một khối text).
   */
  badge?: number | "dot";
}

export type SearchContextType = {
  isSearchOpen: boolean;
  searchText: string;
  setSearchText: (t: string) => void;
  toggleSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;
};
