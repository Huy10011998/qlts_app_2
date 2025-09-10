// src/types/context.d.ts

import Ionicons from "react-native-vector-icons/Ionicons";

// Context cho xác thực
export interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => Promise<void>;
  setRefreshToken: (refreshToken: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

// Payload của JWT
export interface JwtPayload {
  readonly exp: number;
}

// Context cho Header
export interface TabItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons;
}
