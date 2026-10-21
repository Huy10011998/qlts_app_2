import React from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { C, useAppColors } from "../../../utils/helpers/colors";
import { warn } from "../../../utils/Logger";
import {
  ANDROID_STORE_URL,
  IOS_STORE_URL,
  openStoreForUpdate,
} from "../../../utils/AppVersion";
import { startAndroidFlexibleUpdate } from "../../../services/appUpdate/androidInAppUpdate";
import SettingSectionGroup from "../shared/SettingSectionGroup";
import { getSettingGroupColor } from "../shared/settingGroups";
import { useStoreVersionCheck } from "../shared/useStoreVersionCheck";

/** Nhóm Thông tin ứng dụng: phiên bản đang cài, bản mới trên store. */
export default function AppInfoSettingGroup() {
  const colors = useAppColors();
  const {
    installedVersionLabel,
    storeVersionInfo,
    isChecking,
    hasCheckFailed,
    hasNewVersion,
    shouldShowStatus,
    statusLabel,
  } = useStoreVersionCheck();

  const handlePressUpdateApp = async () => {
    if (!storeVersionInfo || !hasNewVersion) return;

    try {
      if (Platform.OS === "android") {
        await startAndroidFlexibleUpdate();
        return;
      }

      await openStoreForUpdate(IOS_STORE_URL);
    } catch (error) {
      warn("[Settings] Open app store failed:", error);

      // Không mở được luồng cập nhật trong app thì vẫn còn đường ra store.
      if (Platform.OS === "android") {
        try {
          await openStoreForUpdate(ANDROID_STORE_URL);
          return;
        } catch (linkError) {
          warn("[Settings] Open Play Store failed:", linkError);
        }
      }

      Alert.alert(
        "Không thể mở Store",
        "Vui lòng mở Store và cập nhật ứng dụng thủ công.",
      );
    }
  };

  return (
    <SettingSectionGroup accent={getSettingGroupColor("appInfo")}>
      <View style={styles.appVersionRow}>
        <View style={[styles.appVersionIcon, { backgroundColor: C.emerald }]}>
          <Ionicons name="cloud-download-outline" size={18} color="#fff" />
        </View>
        <View style={styles.appVersionContent}>
          <Text style={[styles.appVersionTitle, { color: colors.text }]}>
            Phiên bản ứng dụng
          </Text>
          <Text style={[styles.appVersionInstalled, { color: colors.textSub }]}>
            Đã cài đặt: {installedVersionLabel}
          </Text>
          {shouldShowStatus ? (
            <View style={styles.appVersionStatusRow}>
              {isChecking ? (
                <ActivityIndicator
                  size="small"
                  color={colors.textMuted}
                  style={styles.appVersionSpinner}
                />
              ) : (
                <View
                  style={[
                    styles.appVersionStatusDot,
                    {
                      backgroundColor: hasNewVersion
                        ? C.amber
                        : hasCheckFailed
                        ? colors.textMuted
                        : C.emerald,
                    },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.appVersionStatusText,
                  { color: hasNewVersion ? C.amber : colors.textMuted },
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {hasNewVersion ? (
          <TouchableOpacity
            style={[styles.updateButton, { backgroundColor: C.red }]}
            onPress={handlePressUpdateApp}
            activeOpacity={0.75}
          >
            <Text style={styles.updateButtonText}>Cập nhật</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </SettingSectionGroup>
  );
}

const styles = StyleSheet.create({
  appVersionRow: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appVersionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  appVersionContent: {
    flex: 1,
    paddingRight: 10,
  },
  appVersionTitle: {
    fontSize: 14.5,
    fontWeight: "600",
  },
  appVersionInstalled: {
    fontSize: 11.5,
    marginTop: 2,
  },
  appVersionStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  appVersionSpinner: {
    width: 8,
    height: 8,
    marginRight: 6,
    transform: [{ scale: 0.6 }],
  },
  appVersionStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  appVersionStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  updateButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 13,
    borderRadius: 10,
  },
  updateButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
