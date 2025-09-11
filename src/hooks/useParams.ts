import { useLocalSearchParams } from "expo-router";

export function useParams() {
  const params = useLocalSearchParams();

  const {
    propertyReference,
    nameClass,
    id,
    field,
    name,
    idRoot,
    logID,
    id_previous,
  } = params as {
    propertyReference?: string;
    nameClass?: string;
    id?: number;
    field?: any;
    name?: string;
    idRoot?: number;
    logID?: number;
    id_previous?: number;
  };

  return {
    propertyReference,
    nameClass,
    id,
    field,
    name,
    idRoot,
    logID,
    id_previous,
  };
}
