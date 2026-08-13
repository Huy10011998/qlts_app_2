import React from "react";

import QrDetails from "../../components/qrcode/QrDetails";
import ScreenContainer from "../shared/ScreenContainer";
import AssetDetailsContent from "../Assets/shared/AssetDetailsContent";
import AssetDetailHeaderActions from "../../components/assets/detailActions/AssetDetailHeaderActions";
import { useQrDetailMenuItems } from "../../components/qrcode/useQrDetailMenuItems";
import { useParams } from "../../hooks/useParams";
import { TAB_ITEMS } from "../../utils/Helper";

export default function QrDetailsScreen() {
  const { id, nameClass } = useParams();
  const qrMenuItems = useQrDetailMenuItems({ id, nameClass });

  return (
    <ScreenContainer>
      <QrDetails>
        {({
          activeTab,
          setActiveTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
          nameClass: itemNameClass,
          fieldActive,
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
              nameClass={itemNameClass || ""}
              fieldActive={fieldActive}
              tabs={TAB_ITEMS}
            />
            {/* Sau nội dung: panel menu dùng absoluteFill, đặt trước sẽ bị phủ. */}
            <AssetDetailHeaderActions
              item={item}
              nameClass={itemNameClass}
              fieldActive={fieldActive}
              extraItems={qrMenuItems}
            />
          </>
        )}
      </QrDetails>
    </ScreenContainer>
  );
}
