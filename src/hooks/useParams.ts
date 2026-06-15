import { useRoute, RouteProp } from "@react-navigation/native";
import type { OptionalParams, RootStackParamList } from "../types/index";

export function useParams<RouteName extends keyof RootStackParamList>() {
  const route = useRoute<RouteProp<RootStackParamList, RouteName>>();
  const params = route.params as Partial<OptionalParams>;

  return {
    propertyReference: params?.propertyReference,
    nameClass: params?.nameClass,
    nameClassRoot: params?.nameClassRoot,
    id: params?.id,
    field: params?.field,
    name: params?.name,
    idRoot: params?.idRoot,
    logID: params?.logID,
    id_previous: params?.id_previous,
    item: params?.item,
    titleHeader: params?.titleHeader,
    activeTab: params?.activeTab,
    propertyClass: params?.propertyClass,
    returnTo: params?.returnTo,
    groupMenuId: params?.groupMenuId,
    viewPermission: params?.viewPermission,
    prefix: params?.propertyClass?.prefix,
    itemData: params?.itemData,
  };
}
