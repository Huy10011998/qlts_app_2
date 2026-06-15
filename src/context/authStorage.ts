import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {
  AUTH_LOGIN_SERVICE,
  FACE_ID_ENABLED_KEY,
  FACE_ID_LOGIN_SERVICE,
} from "../constants/AuthStorage";

export const AUTH_TOKEN_KEY = "token";
export const AUTH_REFRESH_TOKEN_KEY = "refreshToken";
export const AUTH_USERNAME_KEY = "authUserName";

export const readStoredAuthTokens = async () => {
  const [token, refreshToken] = await Promise.all([
    AsyncStorage.getItem(AUTH_TOKEN_KEY),
    AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY),
  ]);

  return { token, refreshToken };
};

export const writeStoredAuthValue = async (
  key: string,
  value: string | null,
) => {
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

export const clearStoredAuthTokens = () =>
  AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY]);

export const clearStoredFaceIdData = async () => {
  await AsyncStorage.removeItem(FACE_ID_ENABLED_KEY);
  await Promise.all([
    Keychain.resetGenericPassword({ service: AUTH_LOGIN_SERVICE }),
    Keychain.resetGenericPassword({ service: FACE_ID_LOGIN_SERVICE }),
  ]);
};
