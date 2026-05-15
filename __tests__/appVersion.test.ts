import {
  formatVersionWithBuild,
  isNewerAppVersion,
  isNewerVersion,
  selectLatestVersionInfo,
} from "../src/utils/appVersion/version";

describe("app version helpers", () => {
  it("detects newer marketing versions", () => {
    expect(isNewerVersion("2.1", "2.2")).toBe(true);
    expect(isNewerVersion("2.3", "2.2")).toBe(false);
  });

  it("falls back to build comparison when versions match", () => {
    expect(
      isNewerAppVersion({
        currentBuildNumber: "3",
        currentVersion: "2.3",
        latestBuildNumber: "4",
        latestVersion: "2.3",
      }),
    ).toBe(true);
  });

  it("formats version with build number", () => {
    expect(formatVersionWithBuild("2.3", "4")).toBe("2.3 (4)");
    expect(formatVersionWithBuild("2.3")).toBe("2.3");
  });

  it("selects the highest store version from multiple storefronts", () => {
    expect(
      selectLatestVersionInfo([
        {
          latestVersion: "2.1",
          storeUrl: "https://apps.apple.com/us/app/test",
        },
        {
          latestVersion: "2.2",
          storeUrl: "https://apps.apple.com/vn/app/test",
        },
      ]),
    ).toEqual({
      latestVersion: "2.2",
      storeUrl: "https://apps.apple.com/vn/app/test",
    });
  });
});
