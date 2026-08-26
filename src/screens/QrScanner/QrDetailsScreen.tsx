import React from "react";

import QrDetails from "../../components/qrcode/QrDetails";
import ScreenContainer from "../shared/ScreenContainer";
import AssetDetailsContent from "../Assets/shared/AssetDetailsContent";
import AssetDetailHeaderActions from "../../components/assets/detailActions/AssetDetailHeaderActions";
import RecordPrimaryActionBar from "../../components/assets/shared/RecordPrimaryActionBar";
import { TAB_ITEMS } from "../../utils/Helper";

export default function QrDetailsScreen() {
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
            {/* Việc chính sau khi quét một thiết bị: ghi một lần đánh giá. */}
            <RecordPrimaryActionBar
              item={item}
              nameClass={itemNameClass}
              fieldActive={fieldActive}
              listRoute="QrReview"
              // Lưu xong về thẳng máy quét để quét mã kế tiếp.
              returnTo="qrScan"
            />
            {/* Sau nội dung: panel menu dùng absoluteFill, đặt trước sẽ bị phủ. */}
            <AssetDetailHeaderActions
              item={item}
              nameClass={itemNameClass}
              fieldActive={fieldActive}
            />
          </>
        )}
      </QrDetails>
    </ScreenContainer>
  );
}
