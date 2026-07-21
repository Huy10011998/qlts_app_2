import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";

/**
 * Secure auth-token storage backed by the device Keychain/Keystore.
 *
 * Design goals:
 * - Access & refresh tokens live in the encrypted Keychain (two services),
 *   instead of plaintext AsyncStorage.
 * - Seamless migration: installs that still have tokens in the legacy
 *   AsyncStorage keys are moved into the Keychain on first read.
 * - Never worse than before: if any Keychain call fails (unsupported device,
 *   locked keystore…), we fall back to the legacy AsyncStorage keys so a
 *   session is never lost. Behavior then matches the previous implementation.
 */

const ACCESS_SERVICE = "auth-access-token";
const REFRESH_SERVICE = "auth-refresh-token";

// Legacy AsyncStorage keys used by the previous plaintext implementation.
const LEGACY_ACCESS_KEY = "token";
const LEGACY_REFRESH_KEY = "refreshToken";

// Fixed account label for the Keychain entries (only the password matters).
const KEYCHAIN_ACCOUNT = "auth";

const readFromKeychain = async (service: string): Promise<string | null> => {
  const credentials = await Keychain.getGenericPassword({ service });
  return credentials ? credentials.password : null;
};

const writeToKeychain = async (service: string, value: string) => {
  await Keychain.setGenericPassword(KEYCHAIN_ACCOUNT, value, {
    service,
    // Readable after the first unlock post-boot, incl. while the device is
    // later locked — needed so background tasks (push handlers, token refresh)
    // can still read the token, matching the previous AsyncStorage behavior.
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });
};

const resetKeychain = (service: string) =>
  Keychain.resetGenericPassword({ service }).catch(() => {});

const readToken = async (
  service: string,
  legacyKey: string,
): Promise<string | null> => {
  // 1. Prefer the secure Keychain value.
  try {
    const secure = await readFromKeychain(service);
    if (secure) return secure;
  } catch {
    // fall through to legacy storage
  }

  // 2. Migrate a legacy plaintext value into the Keychain (best-effort).
  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy) {
    await writeToken(service, legacyKey, legacy);
  }
  return legacy;
};

const writeToken = async (
  service: string,
  legacyKey: string,
  value: string | null,
): Promise<void> => {
  if (!value) {
    await resetKeychain(service);
    await AsyncStorage.removeItem(legacyKey).catch(() => {});
    return;
  }

  try {
    await writeToKeychain(service, value);
    // Drop any lingering plaintext copy once the secure write succeeds.
    await AsyncStorage.removeItem(legacyKey).catch(() => {});
  } catch {
    // Keychain unavailable → keep the session working via AsyncStorage.
    await AsyncStorage.setItem(legacyKey, value).catch(() => {});
  }
};

export const readAccessToken = () =>
  readToken(ACCESS_SERVICE, LEGACY_ACCESS_KEY);

export const readRefreshToken = () =>
  readToken(REFRESH_SERVICE, LEGACY_REFRESH_KEY);

export const writeAccessToken = (value: string | null) =>
  writeToken(ACCESS_SERVICE, LEGACY_ACCESS_KEY, value);

export const writeRefreshToken = (value: string | null) =>
  writeToken(REFRESH_SERVICE, LEGACY_REFRESH_KEY, value);

export const clearAuthTokens = async (): Promise<void> => {
  await Promise.all([
    resetKeychain(ACCESS_SERVICE),
    resetKeychain(REFRESH_SERVICE),
    AsyncStorage.multiRemove([LEGACY_ACCESS_KEY, LEGACY_REFRESH_KEY]).catch(
      () => {},
    ),
  ]);
};
