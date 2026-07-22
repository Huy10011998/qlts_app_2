import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_LOGIN_SERVICE,
} from "../constants/AuthStorage";
import {
  clearAuthTokens,
  readAccessToken,
  readRefreshToken,
  writeAccessToken,
  writeRefreshToken,
} from "../services/auth/tokenStore";
import { clearFaceIdEnabled } from "../services/auth/faceIdFlag";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_REFRESH_TOKEN_KEY = "refreshToken";
export const AUTH_USERNAME_KEY = "authUserName";

export const readStoredAuthTokens = async () => {
  const [token, refreshToken] = await Promise.all([
    readAccessToken(),
    readRefreshToken(),
  ]);

  return { token, refreshToken };
};

export const writeStoredAuthValue = async (
  key: string,
  value: string | null,
) => {
  // Access/refresh tokens go to the secure Keychain store; other values
  // (e.g. username) stay in AsyncStorage.
  if (key === AUTH_TOKEN_KEY) {
    await writeAccessToken(value);
    return;
  }
  if (key === AUTH_REFRESH_TOKEN_KEY) {
    await writeRefreshToken(value);
    return;
  }

  if (value) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await AsyncStorage.removeItem(key);
};

export const readStoredAuthUsername = async () => {
  const storedUserName = await AsyncStorage.getItem(AUTH_USERNAME_KEY);

  if (storedUserName) return storedUserName;

  const credentials = await Keychain.getGenericPassword({
    service: AUTH_LOGIN_SERVICE,
  });

  return credentials ? credentials.username : null;
};

export const writeStoredAuthUsername = (userName: string | null) =>
  writeStoredAuthValue(AUTH_USERNAME_KEY, userName?.trim() || null);

export const clearStoredAuthTokens = () => clearAuthTokens();

export const clearStoredFaceIdData = async () => {
  await clearFaceIdEnabled();
  await Promise.all([
    Keychain.resetGenericPassword({ service: AUTH_LOGIN_SERVICE }),
    Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE }),
  ]);
};
