import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import {
  ANDROID_STORE_URL,
  IOS_APP_ID,
  IOS_LOOKUP_COUNTRIES,
  IOS_STORE_URL,
} from "./constants";
import { log, warn } from "../Logger";
import { StoreVersionInfo } from "./types";
import { isNewerAppVersion, selectLatestVersionInfo } from "./version";
import { externalFetch } from "../../services/network/externalHttp";
import { checkAndroidUpdate } from "../../services/appUpdate/androidInAppUpdate";

type StoreLookupResult = {
  latestVersion: string;
  storeUrl: string;
};

const fetchWithTimeout = (url: string, timeoutMs = 10000) =>
  externalFetch(url, {
    timeoutMs,
    headers: { "Cache-Control": "no-cache" },
  });

const getIosStoreVersionByCountry = async (
  country: string,
): Promise<StoreLookupResult> => {
  const response = await fetchWithTimeout(
    `https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=${country}&t=${Date.now()}`,
  );
  const data = await response.json();
  const latestVersion = data?.results?.[0]?.version;

  if (!latestVersion || typeof latestVersion !== "string") {
    throw new Error("Cannot resolve iOS store version.");
  }

  return {
    latestVersion,
    storeUrl: data?.results?.[0]?.trackViewUrl ?? IOS_STORE_URL,
  };
};

const getIosStoreVersion = async () => {
  const results = await Promise.allSettled(
    IOS_LOOKUP_COUNTRIES.map(getIosStoreVersionByCountry),
  );

  const versions = results
    .filter(
      (result): result is PromiseFulfilledResult<StoreLookupResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const latestVersion = selectLatestVersionInfo(versions);

  if (!latestVersion) {
    throw new Error("Cannot resolve iOS store version.");
  }

  return latestVersion;
};

/**
 * Dò bản mới và tự quyết luôn `hasUpdate`, vì hai nền tảng biết được những thứ
 * khác nhau: iOS lấy được versionName trên App Store nên so sánh phía app, còn
 * Play In-App Updates chỉ trả lời có/không kèm versionCode.
 *
 * @return null khi dò thất bại thật sự (mất mạng, store lỗi).
 */
export const getStoreVersionInfo =
  async (): Promise<StoreVersionInfo | null> => {
    const currentVersion = DeviceInfo.getVersion();
    const currentBuildNumber = DeviceInfo.getBuildNumber();

    try {
      if (Platform.OS === "ios") {
        const storeInfo = await getIosStoreVersion();

        return {
          currentBuildNumber,
          currentVersion,
          hasUpdate: isNewerAppVersion({
            currentBuildNumber,
            currentVersion,
            latestVersion: storeInfo.latestVersion,
          }),
          latestVersion: storeInfo.latestVersion,
          source: "appStore",
          storeUrl: storeInfo.storeUrl,
        };
      }

      const androidResult = await checkAndroidUpdate();

      return {
        availableVersionCode: androidResult.availableVersionCode ?? undefined,
        currentBuildNumber,
        currentVersion,
        hasUpdate: androidResult.status === "available",
        isCheckUnsupported: androidResult.status === "unsupported",
        source: "playInApp",
        storeUrl: ANDROID_STORE_URL,
      };
    } catch (err) {
      log("[Version] Skip update check", Platform.OS);
      warn("[Version] Update check failed", err);
      return null;
    }
  };
