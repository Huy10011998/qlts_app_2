import AssetDetails from "../../components/assets/AssetDetails";
import ScreenContainer from "../shared/ScreenContainer";
import { useReloadPermissionsOnFocus } from "../../hooks/useReloadPermissionsOnFocus";
import AssetDetailsContent from "./shared/AssetDetailsContent";

export default function AssetDetailsScreen() {
  useReloadPermissionsOnFocus();

  return (
    <ScreenContainer>
      <AssetDetails>
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
            nameClass={nameClass}
            fieldActive={fieldActive}
          />
        )}
      </AssetDetails>
    </ScreenContainer>
  );
}
