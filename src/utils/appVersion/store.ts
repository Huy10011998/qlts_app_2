import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import {
  ANDROID_PACKAGE_NAME,
  ANDROID_STORE_URL,
  IOS_APP_ID,
  IOS_COUNTRY,
  IOS_STORE_URL,
} from "./constants";
import { log, warn } from "../Logger";
import { StoreVersionInfo } from "./types";

const fetchWithTimeout = async (url: string, timeoutMs = 10000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};

const getIosStoreVersion = async () => {
  const response = await fetchWithTimeout(
    `https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=${IOS_COUNTRY}`,
  );
  const data = await response.json();
  const latestVersion = data?.results?.[0]?.version;

  if (!latestVersion || typeof latestVersion !== "string") {
    throw new Error("Cannot resolve iOS store version.");
  }

  return {
    latestVersion,
    storeUrl: IOS_STORE_URL,
  };
};

export const extractAndroidVersion = (html: string) => {
  const patterns = [
    /"softwareVersion":"([^"]+)"/i,
    /\[\[\["([^"]+)"\]\],\[\["Current Version"\]\]/i,
    /\[\[\["([^"]+)"\]\],\[\["Phiên bản hiện tại"\]\]/i,
    /"141":\[\[\["([^"]+)"\]\]/i,
  ];

  for (const pattern of patterns) {
    const matched = html.match(pattern)?.[1]?.trim();
    if (matched && /\d/.test(matched)) {
      return matched;
    }
  }

  return null;
};

const getAndroidStoreVersion = async () => {
  const response = await fetchWithTimeout(
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&hl=en&gl=us`,
  );
  const html = await response.text();
  const latestVersion = extractAndroidVersion(html);

  if (!latestVersion) {
    throw new Error("Cannot resolve Android store version.");
  }

  return {
    latestVersion,
    storeUrl: ANDROID_STORE_URL,
  };
};

export const getStoreVersionInfo = async (): Promise<StoreVersionInfo | null> => {
  const currentVersion = DeviceInfo.getVersion();

  try {
    const storeInfo =
      Platform.OS === "ios"
        ? await getIosStoreVersion()
        : await getAndroidStoreVersion();

    return {
      currentVersion,
      latestVersion: storeInfo.latestVersion,
      storeUrl: storeInfo.storeUrl,
    };
  } catch (err) {
    log("[Version] Skip update check", Platform.OS);
    warn("[Version] Update check failed", err);
    return null;
  }
};
