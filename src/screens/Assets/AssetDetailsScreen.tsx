import React from "react";
import AssetDetails from "../../components/assets/AssetDetails";
import ScreenContainer from "../shared/ScreenContainer";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import AssetDetailsContent from "./shared/AssetDetailsContent";
import AssetDetailHeaderActions from "../../components/assets/detailActions/AssetDetailHeaderActions";

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
