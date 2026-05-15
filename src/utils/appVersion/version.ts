export const normalizeVersion = (version: string) =>
  version
    .split(/[.-]/)
    .map((part) => {
      const parsed = Number.parseInt(part.replace(/\D/g, ""), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });

export const isNewerVersion = (
  currentVersion: string,
  latestVersion: string,
) => {
  const currentParts = normalizeVersion(currentVersion);
  const latestParts = normalizeVersion(latestVersion);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const current = currentParts[index] ?? 0;
    const latest = latestParts[index] ?? 0;

    if (latest > current) return true;
    if (latest < current) return false;
  }

  return false;
};

export const selectLatestVersionInfo = <
  VersionInfo extends { latestVersion: string },
>(
  versions: VersionInfo[],
): VersionInfo | null => {
  if (!versions.length) return null;

  return versions.reduce((latest, versionInfo) =>
    isNewerVersion(latest.latestVersion, versionInfo.latestVersion)
      ? versionInfo
      : latest,
  );
};

export const formatVersionWithBuild = (
  version: string,
  buildNumber?: string | null,
) => {
  if (!buildNumber) return version;
  return `${version} (${buildNumber})`;
};

export const isNewerAppVersion = ({
  currentBuildNumber,
  currentVersion,
  latestBuildNumber,
  latestVersion,
}: {
  currentBuildNumber?: string | null;
  currentVersion: string;
  latestBuildNumber?: string | null;
  latestVersion: string;
}) => {
  if (isNewerVersion(currentVersion, latestVersion)) return true;

  if (currentVersion !== latestVersion || !latestBuildNumber) {
    return false;
  }

  return isNewerVersion(currentBuildNumber ?? "0", latestBuildNumber);
};
