import { AppColors, C } from "../../../utils/helpers/colors";
import { elevation } from "../../../utils/helpers/tokens";

export const BRAND_RED = C.red;

/**
 * Card shadow for the asset list surfaces. Takes the palette because the shadow
 * color differs per appearance; call it from inside a `useStyles` factory.
 */
export const cardShadow = (c: AppColors) => elevation(c.shadow, 3);
