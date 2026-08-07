import React from "react";

import AssetDetails from "../../components/assets/AssetDetails";
import ScreenContainer from "../shared/ScreenContainer";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import AssetDetailsContent from "./shared/AssetDetailsContent";
import FridgeHeaderMenu from "../NoiDia/shared/FridgeHeaderMenu";

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
              contentPaddingBottom={94}
              loadErrorMessage={loadErrorMessage}
            />
            {/* Sau nội dung: panel menu dùng absoluteFill, đặt trước sẽ bị phủ. */}
            <FridgeHeaderMenu nameClass={nameClass} item={item} />
          </>
        )}
      </AssetDetails>
    </ScreenContainer>
  );
}
