import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {
  readFaceIdEnabled,
  writeFaceIdEnabled,
  clearFaceIdEnabled,
} from "../src/services/auth/faceIdFlag";
import {
  FACE_ID_ENABLED_KEY,
  FACE_ID_ENABLED_SERVICE,
} from "../src/constants/AuthStorage";

const getGenericPassword = Keychain.getGenericPassword as jest.Mock;
const setGenericPassword = Keychain.setGenericPassword as jest.Mock;
const resetGenericPassword = Keychain.resetGenericPassword as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getGenericPassword.mockResolvedValue(false);
  setGenericPassword.mockResolvedValue(true);
  resetGenericPassword.mockResolvedValue(true);
});

describe("faceIdFlag", () => {
  it("reads the enabled state from Keychain (survives reinstall)", async () => {
    getGenericPassword.mockResolvedValueOnce({
      username: "faceid",
      password: "1",
      service: FACE_ID_ENABLED_SERVICE,
    });

    await expect(readFaceIdEnabled()).resolves.toBe(true);
  });

  it("treats a '0' Keychain value as disabled", async () => {
    getGenericPassword.mockResolvedValueOnce({
      username: "faceid",
      password: "0",
      service: FACE_ID_ENABLED_SERVICE,
    });

    await expect(readFaceIdEnabled()).resolves.toBe(false);
  });

  it("migrates a legacy AsyncStorage flag into the Keychain", async () => {
    // Keychain empty (fresh build), legacy AsyncStorage flag still present.
    getGenericPassword.mockResolvedValue(false);
    await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "1");

    await expect(readFaceIdEnabled()).resolves.toBe(true);

    expect(setGenericPassword).toHaveBeenCalledWith(
      "faceid",
      "1",
      expect.objectContaining({
        service: FACE_ID_ENABLED_SERVICE,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      }),
    );
  });

  it("returns false when neither Keychain nor AsyncStorage has a value", async () => {
    await expect(readFaceIdEnabled()).resolves.toBe(false);
  });

  it("persists the enabled flag to the Keychain without biometric access control", async () => {
    await writeFaceIdEnabled(true);

    expect(setGenericPassword).toHaveBeenCalledWith(
      "faceid",
      "1",
      expect.objectContaining({
        service: FACE_ID_ENABLED_SERVICE,
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      }),
    );
    // no accessControl → readable silently, no Face ID prompt just to check state
    const opts = setGenericPassword.mock.calls[0][2];
    expect(opts.accessControl).toBeUndefined();
  });

  it("falls back to AsyncStorage when the Keychain write fails", async () => {
    setGenericPassword.mockRejectedValueOnce(new Error("keychain unavailable"));

    await writeFaceIdEnabled(true);

    await expect(AsyncStorage.getItem(FACE_ID_ENABLED_KEY)).resolves.toBe("1");
  });

  it("clearFaceIdEnabled resets the Keychain flag and removes the legacy key", async () => {
    await AsyncStorage.setItem(FACE_ID_ENABLED_KEY, "1");

    await clearFaceIdEnabled();

    expect(resetGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({ service: FACE_ID_ENABLED_SERVICE }),
    );
    await expect(AsyncStorage.getItem(FACE_ID_ENABLED_KEY)).resolves.toBeNull();
  });
});
