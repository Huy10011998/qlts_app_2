// Context cho xác thực
export type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  iosAuthenticated: boolean;
  setIosAuthenticated: (value: boolean) => void;
  setToken: (token: string | null) => Promise<void>;
  setRefreshToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
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
}

export type SearchContextType = {
  isSearchOpen: boolean;
  searchText: string;
  setSearchText: (t: string) => void;
  toggleSearch: () => void;
  openSearch: () => void;
  closeSearch: () => void;
};
