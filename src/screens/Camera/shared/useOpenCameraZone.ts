import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";

import { getAllZoneIds } from "./cameraMenuHelpers";

/** Khu vực camera đã mở, đủ để mở lại từ hàng Truy cập nhanh. */
export type CameraZoneTarget = { id: string; label: string };

/**
 * Mở danh sách camera của một khu vực.
 *
 * Tách khỏi thẻ trong danh sách để hàng Truy cập nhanh mở đúng cùng một cách:
 * danh sách camera được dựng lại từ `rawData` theo toàn bộ khu vực con, nên chỗ
 * nào muốn mở lại cũng phải chạy đúng phép lọc này.
 */
export function useOpenCameraZone(
  rawData: any[],
  onOpened?: (target: CameraZoneTarget) => void,
) {
  const navigation = useNavigation<any>();

  return useCallback(
    (target: CameraZoneTarget) => {
      const zoneId = Number(target.id);
      const zoneIds = getAllZoneIds(zoneId, rawData);

      const cameras = rawData
        .filter(
          (camera) =>
            camera.iD_Camera != null &&
            camera.iD_Camera_Ma != null &&
            zoneIds.includes(camera.iD_VungCamera),
        )
        .map((camera) => ({
          iD_Camera: camera.iD_Camera,
          iD_Camera_MoTa: camera.iD_Camera_MoTa,
          iD_Camera_Ma: camera.iD_Camera_Ma,
        }));

      onOpened?.(target);
      navigation.navigate("CameraList", {
        zoneId,
        zoneName: target.label,
        cameras,
      });
    },
    [navigation, onOpened, rawData],
  );
}
