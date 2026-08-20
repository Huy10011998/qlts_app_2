import type { ImageSourcePropType } from "react-native";

import { removeVietnameseTones } from "../../../utils/helpers/string";

/**
 * Toạ độ một điểm trong ảnh, chuẩn hoá theo [0..1] của chiều rộng/chiều cao ảnh
 * gốc. Dùng số chuẩn hoá để lớp vẽ đè bám đúng mái ở mọi bề rộng máy, kể cả khi
 * ảnh bị `resizeMode="cover"` cắt bớt trên dưới.
 */
export type PlantScenePoint = readonly [number, number];

/** Một mặt mái được phủ pin. Một nhà máy có thể có nhiều khối nhà. */
export type PlantPanelZone = {
  /**
   * Bốn góc mặt mái, theo thứ tự trên-trái, trên-phải, dưới-phải, dưới-trái.
   * Đo trực tiếp trên ảnh gốc; mái nhìn nghiêng nên đây là tứ giác bất kỳ chứ
   * không phải hình chữ nhật.
   */
  corners: readonly [
    PlantScenePoint,
    PlantScenePoint,
    PlantScenePoint,
    PlantScenePoint,
  ];
  /** Số module ngang/dọc, quyết định luôn số hàng của hiệu ứng sáng. */
  cols: number;
  rows: number;
};

export type PlantScene = {
  image: ImageSourcePropType;
  /** Kích thước ảnh gốc – cần để tính phần bị cắt khi ảnh phủ kín khung. */
  imageSize: { height: number; width: number };
  /** Mặt mái đầu tiên là mái chính: nhãn và mũi tên xanh neo theo mái này. */
  panelZones: readonly PlantPanelZone[];
  match: string;
};

const PLANT_SCENES: PlantScene[] = [
  {
    image: require("../../../assets/images/plant-vinh-loc.jpg"),
    imageSize: { height: 757, width: 1920 },
    match: "vinh loc",
    panelZones: [
      {
        cols: 12,
        // Mép dưới dừng ở v=0.49: thấp hơn nữa là chạm vòm trắng "CHOLIMEX
        // FOOD" che chân dàn pin, viền sáng sẽ nằm trên vòm trắng chứ không
        // trên pin.
        corners: [
          [0.391, 0.006],
          [0.627, 0.006],
          [0.701, 0.49],
          [0.298, 0.49],
        ],
        rows: 6,
      },
    ],
  },
  {
    image: require("../../../assets/images/plant-ben-luc.jpg"),
    imageSize: { height: 795, width: 1920 },
    match: "ben luc",
    panelZones: [
      {
        // Mái xanh của khối nhà chính. Hai mép trái/phải nghiêng vào trong gần
        // bằng nhau nên khối pin ra hình chữ nhật nhìn nghiêng; bám sát cạnh
        // chéo của mảng mái trắng chữ L (u=0.262) thì phủ rộng hơn nhưng mép
        // trái xoè ra trong khi mép phải dựng đứng, nhìn méo hẳn. Trên là diềm
        // mái phía xa, phải dừng trước khối kho xanh đậm, dưới dừng trước nóc
        // khối văn phòng trắng.
        cols: 12,
        corners: [
          [0.324, 0.306],
          [0.6, 0.292],
          [0.616, 0.478],
          [0.306, 0.466],
        ],
        rows: 6,
      },
      {
        // Mảng mái hình nêm còn lại bên trái, kẹp giữa cạnh chéo của mái trắng
        // chữ L và mép trái dàn chính. Tách thành dàn riêng chứ không nhập vào
        // dàn chính: nhập vào thì mép trái dàn chính phải xoè theo cạnh chéo,
        // cả khối nhìn méo.
        cols: 3,
        corners: [
          [0.2995, 0.345],
          [0.3193, 0.3475],
          [0.306, 0.466],
          [0.2635, 0.4385],
        ],
        rows: 4,
      },
      {
        // Mái khối kho xanh đậm bên phải – mặt trên hình bình hành, thu vào ~2%
        // để không tràn xuống hai mặt tường.
        cols: 8,
        corners: [
          [0.618, 0.291],
          [0.735, 0.288],
          [0.832, 0.421],
          [0.66, 0.426],
        ],
        rows: 6,
      },
    ],
  },
];

export const getPlantScene = (siteName?: string | null): PlantScene | null => {
  const normalized = removeVietnameseTones(String(siteName ?? "")).trim();

  if (!normalized) return null;

  return (
    PLANT_SCENES.find((scene) => normalized.includes(scene.match)) ?? null
  );
};
