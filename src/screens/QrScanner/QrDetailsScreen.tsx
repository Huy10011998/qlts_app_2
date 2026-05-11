import QrDetails from "../../components/qrcode/QrDetails";
import ScreenContainer from "../shared/ScreenContainer";
import AssetDetailsContent from "../Assets/shared/AssetDetailsContent";

export default function QrDetailsScreen() {
  return (
    <ScreenContainer backgroundColor="#F9F9F9">
      <QrDetails>
        {({
          activeTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
          nameClass,
          fieldActive,
        }) => (
          <AssetDetailsContent
            activeTab={activeTab}
            groupedFields={groupedFields}
            collapsedGroups={collapsedGroups}
            toggleGroup={toggleGroup}
            getFieldValue={getFieldValue}
            item={item}
            nameClass={nameClass || ""}
            fieldActive={fieldActive}
          />
        )}
      </QrDetails>
    </ScreenContainer>
  );
}
