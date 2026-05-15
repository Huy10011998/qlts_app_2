import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";
import {
  ANDROID_LOOKUP_LOCALES,
  ANDROID_PACKAGE_NAME,
  ANDROID_STORE_URL,
  IOS_APP_ID,
  IOS_LOOKUP_COUNTRIES,
  IOS_STORE_URL,
} from "./constants";
import { log, warn } from "../Logger";
import { StoreVersionInfo } from "./types";
import { selectLatestVersionInfo } from "./version";

type StoreLookupResult = {
  latestVersion: string;
  storeUrl: string;
};

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

const getIosStoreVersionByCountry = async (
  country: string,
): Promise<StoreLookupResult> => {
  const response = await fetchWithTimeout(
    `https://itunes.apple.com/lookup?id=${IOS_APP_ID}&country=${country}`,
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

const getAndroidStoreVersionByLocale = async ({
  hl,
  gl,
}: {
  hl: string;
  gl: string;
}): Promise<StoreLookupResult> => {
  const response = await fetchWithTimeout(
    `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_NAME}&hl=${hl}&gl=${gl}`,
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

const getAndroidStoreVersion = async () => {
  const results = await Promise.allSettled(
    ANDROID_LOOKUP_LOCALES.map(getAndroidStoreVersionByLocale),
  );

  const versions = results
    .filter(
      (result): result is PromiseFulfilledResult<StoreLookupResult> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const latestVersion = selectLatestVersionInfo(versions);

  if (!latestVersion) {
    throw new Error("Cannot resolve Android store version.");
  }

  return latestVersion;
};

export const getStoreVersionInfo = async (): Promise<StoreVersionInfo | null> => {
  const currentVersion = DeviceInfo.getVersion();
  const currentBuildNumber = DeviceInfo.getBuildNumber();

  try {
    const storeInfo =
      Platform.OS === "ios"
        ? await getIosStoreVersion()
        : await getAndroidStoreVersion();

    return {
      currentBuildNumber,
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
