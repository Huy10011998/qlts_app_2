import React, { useEffect, useRef } from "react";
import ReactTestRenderer from "react-test-renderer";
import { Alert } from "react-native";
import { useAppUpdateChecker } from "../src/app/bootstrap/useAppUpdateChecker";
import {
  getStoreVersionInfo,
  shouldShowUpdateReminder,
} from "../src/utils/AppVersion";

jest.mock("../src/utils/AppVersion", () => ({
  formatVersionWithBuild: jest.fn((version: string, buildNumber?: string) =>
    buildNumber ? `${version} (${buildNumber})` : version,
  ),
  getStoreVersionInfo: jest.fn(),
  isNewerAppVersion: jest.fn(() => true),
  markUpdateReminderDismissed: jest.fn(),
  openStoreForUpdate: jest.fn(),
  shouldShowUpdateReminder: jest.fn(),
}));

const mockedGetStoreVersionInfo = jest.mocked(getStoreVersionInfo);
const mockedShouldShowUpdateReminder = jest.mocked(shouldShowUpdateReminder);
const mockedAlert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

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
    mockedGetStoreVersionInfo.mockResolvedValue({
      currentBuildNumber: "1",
      currentVersion: "1.0.0",
      latestBuildNumber: "2",
      latestVersion: "1.0.1",
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
      latestBuildNumber: "3",
      latestVersion: "1.0.2",
      storeUrl: "https://example.com/store",
    });

    await ReactTestRenderer.act(async () => {
      await checkAppUpdate?.();
      await flushMicrotasks();
    });

    expect(mockedAlert).toHaveBeenCalledTimes(2);
  });
});
