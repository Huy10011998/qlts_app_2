export type StoreVersionInfo = {
  currentVersion: string;
  latestVersion: string;
  storeUrl: string;
};

export type UpdateReminderState = {
  dismissedAt: number;
  latestVersion: string;
};
