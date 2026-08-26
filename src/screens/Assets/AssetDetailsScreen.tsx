import React from "react";
import AssetDetails from "../../components/assets/AssetDetails";
import ScreenContainer from "../shared/ScreenContainer";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import AssetDetailsContent from "./shared/AssetDetailsContent";
import AssetDetailHeaderActions from "../../components/assets/detailActions/AssetDetailHeaderActions";
import RecordActionBar from "../../components/assets/shared/RecordActionBar";

export default function AssetDetailsScreen() {
  useReloadPermissionsOnFocus();

  return (
    <ScreenContainer>
      <AssetDetails>
        {({
          activeTab,
          setActiveTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
          TAB_ITEMS,
          nameClass,
          fieldActive,
          loadErrorMessage,
          refreshDetails,
          isRefreshing,
        }) => (
          <>
            <AssetDetailsContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              groupedFields={groupedFields}
              collapsedGroups={collapsedGroups}
              toggleGroup={toggleGroup}
              getFieldValue={getFieldValue}
              item={item}
              nameClass={nameClass}
              fieldActive={fieldActive}
              tabs={TAB_ITEMS ?? []}
              loadErrorMessage={loadErrorMessage}
              onRefresh={refreshDetails}
              isRefreshing={isRefreshing}
            />
            {/*
              Cùng đường tắt như nút vuốt ở danh sách: vào thẳng màn tạo bản ghi
              con, khỏi phải qua tab "Chi tiết" → danh mục → nút thêm mới.
              Không dùng `returnTo: "qrScan"` như luồng QR — vào từ danh sách thì
              không có máy quét nào để quay về.
            */}
            <RecordActionBar
              item={item}
              nameClass={nameClass}
              fieldActive={fieldActive}
              listRoute="AssetRelatedList"
              returnTo="openAssetRelatedList"
            />
            {/* Sau nội dung: panel menu dùng absoluteFill, đặt trước sẽ bị phủ. */}
            <AssetDetailHeaderActions
              item={item}
              nameClass={nameClass}
              fieldActive={fieldActive}
              loadErrorMessage={loadErrorMessage}
            />
          </>
        )}
      </AssetDetails>
    </ScreenContainer>
  );
}
