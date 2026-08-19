import React, { JSX } from "react";
import { RefreshControl, ScrollView, View } from "react-native";

import type { TabContentProps } from "../../types";
import AssetGroupList from "../assets/AssetGroupList";
import AssetListAttachFile from "../assets/AssetAttachFile";
import AssetDeTailsTab from "../assets/AssetDetailsTab";
import AssetListHistory from "../assets/AssetListHistory";
import AssetNoteDetails from "../assets/AssetNoteDetails";
import AssetListEmptyState from "../assets/shared/AssetListEmptyState";
import { getRecordLabel } from "../assets/detailActions/useAssetRecordActions";
import {
  AppColors,
  useAppColors,
  useThemeValue,
} from "../../utils/helpers/colors";

const makeStyles = (c: AppColors) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyStateRoot: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 32,
  },
});

export default function TabContent({
  activeTab,
  groupedFields,
  collapsedGroups,
  toggleGroup,
  getFieldValue,
  item,
  previousItem,
  isFieldChanged,
  nameClass,
  fieldActive,
  loadErrorMessage,
  onRefresh,
  isRefreshing = false,
}: TabContentProps) {
  const styles = useThemeValue(makeStyles);
  const c = useAppColors();
  const nameClassRoot = nameClass;
  const shouldShowDetailsError = Boolean(loadErrorMessage);
  // Cùng nguồn với badge mã bản ghi trên header màn chi tiết
  // (AssetDetailHeaderActions), nên danh sách con hiện đúng mã mà màn cha đang
  // hiện — không phát sinh request nào.
  const rootRecordLabel = getRecordLabel(item, fieldActive);

  const tabContentMap: Record<string, JSX.Element> = {
    list: (
      <View style={styles.container}>
        {shouldShowDetailsError ? (
          <View style={styles.emptyStateRoot}>
            <AssetListEmptyState
              iconName="cloud-offline-outline"
              title="Không thể tải chi tiết thông tin"
              subtitle={
                loadErrorMessage ||
                "Vui lòng kiểm tra kết nối mạng hoặc quay lại để thử lại."
              }
            />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={[c.red]}
                  tintColor={c.red}
                />
              ) : undefined
            }
          >
            <AssetGroupList
              groupedFields={groupedFields}
              collapsedGroups={collapsedGroups}
              toggleGroup={toggleGroup}
              getFieldValue={getFieldValue}
              item={item}
              previousItem={previousItem}
              fieldActive={fieldActive}
              isFieldChanged={isFieldChanged}
              nameClass={nameClass}
            />
          </ScrollView>
        )}
      </View>
    ),

    details: (
      <AssetDeTailsTab
        nameClassRoot={nameClassRoot}
        rootRecordLabel={rootRecordLabel}
      />
    ),
    notes: (
      <AssetNoteDetails
        text={item?.notes ?? "---"}
        loadErrorMessage={loadErrorMessage}
      />
    ),
    history: <AssetListHistory rootRecordLabel={rootRecordLabel} />,
    attach: <AssetListAttachFile />,
  };

  return tabContentMap[activeTab] || null;
}
