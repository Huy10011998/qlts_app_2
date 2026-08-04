import type { ImageSourcePropType } from "react-native";

import { removeVietnameseTones } from "../../../utils/helpers/string";

type PlantScene = {
  image: ImageSourcePropType;
  match: string;
};

const PLANT_SCENES: PlantScene[] = [
  {
    image: require("../../../assets/images/plant-vinh-loc.png"),
    match: "vinh loc",
  },
  {
    image: require("../../../assets/images/plant-ben-luc.jpg"),
    match: "ben luc",
  },
];

export const getPlantSceneImage = (
  siteName?: string | null,
): ImageSourcePropType | null => {
  const normalized = removeVietnameseTones(String(siteName ?? "")).trim();

  if (!normalized) return null;

  return (
    PLANT_SCENES.find((scene) => normalized.includes(scene.match))?.image ??
    null
  );
};
