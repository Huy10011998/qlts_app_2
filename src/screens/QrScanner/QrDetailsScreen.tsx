import React from "react";

import QrDetails from "../../components/qrcode/QrDetails";
import ScreenContainer from "../shared/ScreenContainer";
import AssetDetailsContent from "../Assets/shared/AssetDetailsContent";
import AssetDetailHeaderActions from "../../components/assets/detailActions/AssetDetailHeaderActions";
import RecordActionBar from "../../components/assets/shared/RecordActionBar";
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
            {/*
              Việc làm được với thiết bị vừa quét. `scanFlow` mở sẵn bảng chọn khi
              có nhiều việc: quét xong là để LÀM gì đó, không phải để đọc.
            */}
            <RecordActionBar
              item={item}
              nameClass={itemNameClass}
              fieldActive={fieldActive}
              listRoute="QrReview"
              // Lưu xong về thẳng máy quét để quét mã kế tiếp.
              returnTo="qrScan"
              scanFlow
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
