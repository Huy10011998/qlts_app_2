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
          setActiveTab,
          groupedFields,
          collapsedGroups,
          toggleGroup,
          item,
          getFieldValue,
          TAB_ITEMS,
          nameClass,
          fieldActive,
        }) => (
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
          />
        )}
      </AssetDetails>
    </ScreenContainer>
  );
}
