import React, { useEffect, useRef } from "react";
import ReactTestRenderer from "react-test-renderer";
import { Alert, Platform } from "react-native";
import { useAppUpdateChecker } from "../src/app/bootstrap/useAppUpdateChecker";
import {
  getStoreVersionInfo,
  openStoreForUpdate,
  shouldShowUpdateReminder,
} from "../src/utils/AppVersion";
import { startAndroidFlexibleUpdate } from "../src/services/appUpdate/androidInAppUpdate";

jest.mock("../src/utils/AppVersion", () => ({
  ANDROID_STORE_URL: "https://play.google.com/store/apps/details?id=test",
  formatVersionWithBuild: jest.fn((version: string, buildNumber?: string) =>
    buildNumber ? `${version} (${buildNumber})` : version,
  ),
  getStoreVersionInfo: jest.fn(),
  getUpdateReminderKey: jest.fn(
    ({
      availableVersionCode,
      latestVersion,
    }: {
      availableVersionCode?: number;
      latestVersion?: string;
    }) =>
      latestVersion ??
      (availableVersionCode != null ? String(availableVersionCode) : null),
  ),
  markUpdateReminderDismissed: jest.fn(),
  openStoreForUpdate: jest.fn(),
  shouldShowUpdateReminder: jest.fn(),
}));

jest.mock("../src/services/appUpdate/androidInAppUpdate", () => ({
  addAndroidUpdateDownloadedListener: jest.fn(() => jest.fn()),
  completeAndroidFlexibleUpdate: jest.fn(),
  startAndroidFlexibleUpdate: jest.fn(),
}));

const mockedGetStoreVersionInfo = jest.mocked(getStoreVersionInfo);
const mockedShouldShowUpdateReminder = jest.mocked(shouldShowUpdateReminder);
const mockedStartAndroidFlexibleUpdate = jest.mocked(
  startAndroidFlexibleUpdate,
);
const mockedOpenStoreForUpdate = jest.mocked(openStoreForUpdate);
const mockedAlert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

/** Platform.OS là hằng đọc-chỉ nên phải ghi đè qua defineProperty. */
const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { configurable: true, value: os });
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

type HarnessProps = {
  authReady?: boolean;
  iosAuthenticated: boolean;
  isAuthenticated: boolean;
  onReady: (check: () => Promise<void>) => void;
};

function Harness({
  authReady,
  iosAuthenticated,
  isAuthenticated,
  onReady,
}: HarnessProps) {
  const isAuthenticatedRef = useRef(isAuthenticated);
  const authReadyRef = useRef(authReady);
  const iosAuthenticatedRef = useRef(iosAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
    authReadyRef.current = authReady;
    iosAuthenticatedRef.current = iosAuthenticated;
  }, [authReady, iosAuthenticated, isAuthenticated]);

  const { checkAppUpdateRef } = useAppUpdateChecker({
    isAuthenticated,
    authReady,
    iosAuthenticated,
    isAuthenticatedRef,
    authReadyRef,
    iosAuthenticatedRef,
  });

  useEffect(() => {
    onReady(checkAppUpdateRef.current);
  }, [checkAppUpdateRef, onReady]);

  return null;
}

describe("useAppUpdateChecker", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform("ios");
    mockedGetStoreVersionInfo.mockResolvedValue({
      currentBuildNumber: "1",
      currentVersion: "1.0.0",
      hasUpdate: true,
      latestBuildNumber: "2",
      latestVersion: "1.0.1",
      source: "appStore",
      storeUrl: "https://example.com/store",
    });
    mockedShouldShowUpdateReminder.mockResolvedValue(true);
  });

  it("shows the update alert only once for the same version in a session", async () => {
    let checkAppUpdate: (() => Promise<void>) | null = null;

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <Harness
          authReady
          iosAuthenticated
          isAuthenticated
          onReady={(check) => {
            checkAppUpdate = check;
          }}
        />,
      );
      await flushMicrotasks();
    });

    expect(mockedAlert).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      await checkAppUpdate?.();
      await checkAppUpdate?.();
      await flushMicrotasks();
    });

    expect(mockedAlert).toHaveBeenCalledTimes(1);
  });

  it("allows showing a newer version again in the same session", async () => {
    let checkAppUpdate: (() => Promise<void>) | null = null;

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <Harness
          authReady
          iosAuthenticated
          isAuthenticated
          onReady={(check) => {
            checkAppUpdate = check;
          }}
        />,
      );
      await flushMicrotasks();
    });

    mockedGetStoreVersionInfo.mockResolvedValue({
      currentBuildNumber: "1",
      currentVersion: "1.0.0",
      hasUpdate: true,
      latestBuildNumber: "3",
      latestVersion: "1.0.2",
      source: "appStore",
      storeUrl: "https://example.com/store",
    });

    await ReactTestRenderer.act(async () => {
      await checkAppUpdate?.();
      await flushMicrotasks();
    });

    expect(mockedAlert).toHaveBeenCalledTimes(2);
  });

  it("does not prompt when the store reports no update", async () => {
    mockedGetStoreVersionInfo.mockResolvedValue({
      currentBuildNumber: "1",
      currentVersion: "1.0.0",
      hasUpdate: false,
      latestVersion: "1.0.0",
      source: "appStore",
      storeUrl: "https://example.com/store",
    });

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <Harness authReady iosAuthenticated isAuthenticated onReady={() => {}} />,
      );
      await flushMicrotasks();
    });

    expect(mockedAlert).not.toHaveBeenCalled();
  });

  describe("on Android", () => {
    beforeEach(() => {
      setPlatform("android");
      mockedGetStoreVersionInfo.mockResolvedValue({
        availableVersionCode: 131,
        currentBuildNumber: "130",
        currentVersion: "2.37",
        hasUpdate: true,
        source: "playInApp",
        storeUrl: "https://play.google.com/store/apps/details?id=test",
      });
      mockedStartAndroidFlexibleUpdate.mockResolvedValue(true);
    });

    it("opens the Play flexible update flow instead of an alert", async () => {
      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <Harness
            authReady
            iosAuthenticated={false}
            isAuthenticated
            onReady={() => {}}
          />,
        );
        await flushMicrotasks();
      });

      expect(mockedStartAndroidFlexibleUpdate).toHaveBeenCalledTimes(1);
      expect(mockedAlert).not.toHaveBeenCalled();
      expect(mockedOpenStoreForUpdate).not.toHaveBeenCalled();
    });

    it("falls back to the Play Store page when the flow cannot start", async () => {
      mockedStartAndroidFlexibleUpdate.mockRejectedValue(
        new Error("no activity"),
      );
      mockedOpenStoreForUpdate.mockResolvedValue(undefined);

      await ReactTestRenderer.act(async () => {
        ReactTestRenderer.create(
          <Harness
            authReady
            iosAuthenticated={false}
            isAuthenticated
            onReady={() => {}}
          />,
        );
        await flushMicrotasks();
      });

      expect(mockedOpenStoreForUpdate).toHaveBeenCalledWith(
        "https://play.google.com/store/apps/details?id=test",
      );
    });
  });
});
