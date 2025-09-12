import { useRoute, RouteProp } from "@react-navigation/native";
import { OptionalParams, RootStackParamList } from "../types";

export function useParams<RouteName extends keyof RootStackParamList>() {
  const route = useRoute<RouteProp<RootStackParamList, RouteName>>();
  const params = route.params as Partial<OptionalParams>;

  return {
    propertyReference: params?.propertyReference,
    nameClass: params?.nameClass,
    id: params?.id,
    field: params?.field,
    name: params?.name,
    idRoot: params?.idRoot,
    logID: params?.logID,
    id_previous: params?.id_previous,
  };
}
