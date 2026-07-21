import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Keychain from "react-native-keychain";
import {
  readAccessToken,
  writeAccessToken,
  clearAuthTokens,
} from "../src/services/auth/tokenStore";

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

describe("tokenStore", () => {
  it("reads the token from Keychain when present", async () => {
    getGenericPassword.mockResolvedValueOnce({
      username: "auth",
      password: "secure-access",
      service: "auth-access-token",
    });

    await expect(readAccessToken()).resolves.toBe("secure-access");
  });

  it("migrates a legacy AsyncStorage token into the Keychain, then clears plaintext", async () => {
    // Keychain empty, but a legacy plaintext token exists.
    getGenericPassword.mockResolvedValue(false);
    await AsyncStorage.setItem("token", "legacy-access");

    const result = await readAccessToken();

    expect(result).toBe("legacy-access");
    // migrated into the Keychain
    expect(setGenericPassword).toHaveBeenCalledWith(
      "auth",
      "legacy-access",
      expect.objectContaining({
        service: "auth-access-token",
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      }),
    );
    // legacy plaintext removed
    await expect(AsyncStorage.getItem("token")).resolves.toBeNull();
  });

  it("writes the token to Keychain and drops any legacy plaintext", async () => {
    await AsyncStorage.setItem("token", "old");
    await writeAccessToken("new-access");

    expect(setGenericPassword).toHaveBeenCalledWith(
      "auth",
      "new-access",
      expect.objectContaining({
        service: "auth-access-token",
        accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK,
      }),
    );
    await expect(AsyncStorage.getItem("token")).resolves.toBeNull();
  });

  it("falls back to AsyncStorage when the Keychain write fails (never loses session)", async () => {
    setGenericPassword.mockRejectedValueOnce(new Error("keychain unavailable"));

    await writeAccessToken("fallback-access");

    await expect(AsyncStorage.getItem("token")).resolves.toBe("fallback-access");
  });

  it("writing null resets the Keychain entry", async () => {
    await writeAccessToken(null);
    expect(resetGenericPassword).toHaveBeenCalledWith(
      expect.objectContaining({ service: "auth-access-token" }),
    );
  });

  it("clearAuthTokens resets both Keychain services", async () => {
    await clearAuthTokens();
    const services = resetGenericPassword.mock.calls.map((c) => c[0].service);
    expect(services).toEqual(
      expect.arrayContaining(["auth-access-token", "auth-refresh-token"]),
    );
  });
});
