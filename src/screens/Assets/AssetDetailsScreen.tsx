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
              Màn này là đường KHÔNG qua máy quét (danh sách, mã bản ghi cha trên
              header màn con) nên thanh bỏ việc tạo bản ghi con: tab "Chi tiết" đã
              có đúng các danh mục đó, còn danh sách có nút vuốt thêm nhanh. Chỉ
              còn nghiệp vụ riêng (tủ lạnh); loại tài sản thường thì không có thanh.
              Màn chi tiết của luồng QR (`QrDetailsScreen`) vẫn đủ cả.
            */}
            <RecordActionBar
              item={item}
              nameClass={nameClass}
              fieldActive={fieldActive}
              includeChildClasses={false}
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
