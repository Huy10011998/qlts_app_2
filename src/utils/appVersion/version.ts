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
