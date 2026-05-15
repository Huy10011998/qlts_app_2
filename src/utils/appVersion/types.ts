export type StoreVersionInfo = {
  currentBuildNumber: string;
  currentVersion: string;
  latestBuildNumber?: string;
  latestVersion: string;
  storeUrl: string;
};

export type UpdateReminderState = {
  dismissedAt: number;
  latestVersion: string;
};
