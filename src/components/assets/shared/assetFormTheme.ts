import { AppColors, C } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";

export const ASSET_FORM_BRAND_RED = C.red;

export const assetFormCardShadow = (c: AppColors) => elevation(c.shadow, 2);
