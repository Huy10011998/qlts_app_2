import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import {
  UPDATE_REMINDER_DELAY_MS,
  UPDATE_REMINDER_KEY,
} from "./constants";
import { UpdateReminderState } from "./types";
import { warn } from "../Logger";

export const openStoreForUpdate = async (storeUrl: string) => {
  await Linking.openURL(storeUrl);
};

export const shouldShowUpdateReminder = async (latestVersion: string) => {
  try {
    const rawValue = await AsyncStorage.getItem(UPDATE_REMINDER_KEY);
    if (!rawValue) return true;

    const parsed = JSON.parse(rawValue) as UpdateReminderState;
    if (!parsed?.latestVersion || !parsed?.dismissedAt) return true;

    if (parsed.latestVersion !== latestVersion) {
      return true;
    }

    return Date.now() - parsed.dismissedAt >= UPDATE_REMINDER_DELAY_MS;
  } catch (err) {
    warn("[Version] Failed to read reminder state", err);
    return true;
  }
};

export const markUpdateReminderDismissed = async (latestVersion: string) => {
  try {
    const nextState: UpdateReminderState = {
      dismissedAt: Date.now(),
      latestVersion,
    };

    await AsyncStorage.setItem(UPDATE_REMINDER_KEY, JSON.stringify(nextState));
  } catch (err) {
    warn("[Version] Failed to save reminder state", err);
  }
};
