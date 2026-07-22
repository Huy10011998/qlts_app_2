import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {
  FACE_ID_ENABLED_KEY,
  FACE_ID_ENABLED_SERVICE,
} from "../../constants/AuthStorage";
import { error } from "../../utils/Logger";

// Persisted "Face ID enabled" flag.
//
// The state lives in the Keychain (survives uninstall/reinstall on iOS) so a
// user who reinstalls the app can keep using Face ID without re-typing their
// password. The legacy AsyncStorage key is still read once for migration and
// used as a last-resort fallback if the Keychain write ever fails.

const ENABLED_VALUE = "1";
const DISABLED_VALUE = "0";
const ACCOUNT = "faceid";

const persistToKeychain = (value: string) =>
  Keychain.setGenericPassword(ACCOUNT, value, {
    service: FACE_ID_ENABLED_SERVICE,
    // No access control: this is a non-secret flag we must read silently
    // (without a biometric prompt) to decide whether to show the Face ID UI.
    accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
  });

export const writeFaceIdEnabled = async (enabled: boolean) => {
  const value = enabled ? ENABLED_VALUE : DISABLED_VALUE;
  try {
    await persistToKeychain(value);
    // Keep the legacy key in sync so older code paths / debugging stay coherent.
    await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, value);
  } catch (e) {
    error("[FaceId] Failed to persist enabled flag to Keychain", e);
    // Fall back to AsyncStorage so the setting is not lost this session.
    await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, value);
  }
};

export const readFaceIdEnabled = async (): Promise<boolean> => {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: FACE_ID_ENABLED_SERVICE,
    });
    if (credentials) {
      return credentials.password === ENABLED_VALUE;
    }
  } catch (e) {
    error("[FaceId] Failed to read enabled flag from Keychain", e);
  }

  // Migration / fallback: pull a legacy AsyncStorage value written by an
  // older build and promote it into the Keychain so it becomes durable.
  const legacy = await AsyncStorage.getItem(FACE_ID_ENABLED_KEY);
  if (legacy !== null) {
    try {
      await persistToKeychain(legacy);
    } catch {
      // Migration is best-effort; ignore failures.
    }
  }
  return legacy === ENABLED_VALUE;
};

export const clearFaceIdEnabled = async () => {
  try {
    await Keychain.resetGenericPassword({ service: FACE_ID_ENABLED_SERVICE });
  } catch (e) {
    error("[FaceId] Failed to reset enabled flag", e);
  }
  await AsyncStorage.removeItem(FACE_ID_ENABLED_KEY);
};
