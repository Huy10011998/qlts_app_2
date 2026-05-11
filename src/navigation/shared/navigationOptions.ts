import { capitalizeFirstLetter } from "../../utils/helpers/string";
import { HeaderDetails } from "../../components/header/HeaderDetails";

export const headerWithBack = HeaderDetails({ showBackButton: true });

export const getScreenTitle = (
  routeTitle: string | undefined,
  fallback: string,
) => (routeTitle ? capitalizeFirstLetter(routeTitle) : fallback);
