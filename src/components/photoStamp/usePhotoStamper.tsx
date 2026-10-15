import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  PixelRatio,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";

import { AppColors, useAppColors, useStyles } from "../../utils/helpers/colors";
import { error, warn } from "../../utils/Logger";
import {
  getCurrentCoordinates,
  prepareLocationPermission,
  type Coordinates,
} from "../../utils/location/currentPosition";
import { reverseGeocode } from "../../utils/location/reverseGeocode";
import PhotoWatermark, {
  getWatermarkFrame,
  type WatermarkLines,
} from "./PhotoWatermark";
import { loadWatermarkAccountName } from "./useWatermarkAccountName";

/** Quá lâu chưa nung xong thì bỏ cuộc, đừng để user kẹt ở vòng xoay. */
const STAMP_TIMEOUT_MS = 8000;

export type StampLocating = {
  /** Bọc trong object để `await startLocating()` không đợi luôn toạ độ. */
  coordinates: Promise<Coordinates | null>;
  /** Bị từ chối quyền thì thôi, đừng hỏi lại lúc chụp xong. */
  granted: boolean;
};

export type StampPhotoInput = {
  uri: string;
  width?: number;
  height?: number;
};

type StampJob = {
  uri: string;
  width: number;
  height: number;
  lines: WatermarkLines;
};

const pad = (value: number) => String(value).padStart(2, "0");

/** "15/10/2026 10:34" — cùng dạng với ảnh xác nhận tủ lạnh. */
const formatStampTime = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;

/**
 * Xin quyền vị trí rồi bắt đầu lấy toạ độ. Gọi TRƯỚC khi mở camera: hộp thoại
 * xin quyền không chen vào camera, và toạ độ lấy song song lúc user đang chụp.
 */
export const startLocating = async (): Promise<StampLocating> => {
  const granted = await prepareLocationPermission();
  return { coordinates: granted ? getCurrentCoordinates() : Promise.resolve(null), granted };
};

/** Chụp xong mà GPS chưa có toạ độ thì đợi thêm tối đa chừng này rồi bỏ qua. */
const LOCATION_WAIT_MS = 5000;

const withTimeout = <T,>(promise: Promise<T | null>, ms: number) =>
  Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

/** Toạ độ đã cũ tới mức này vẫn dùng được cho ảnh — người chụp vẫn quanh đó. */
const RETRY_MAXIMUM_AGE_MS = 120000;

/**
 * Lúc camera mở app nằm nền, Android có thể không trả toạ độ (quyền "khi dùng
 * ứng dụng"). Chụp xong mà chưa có thì hỏi lại 1 lần — giờ app đã ở trước.
 */
const waitCoordinates = async (locating: StampLocating | null) => {
  if (!locating) return null;
  const first = await withTimeout(locating.coordinates, LOCATION_WAIT_MS);
  if (first || !locating.granted) return first;
  return withTimeout(getCurrentCoordinates({ maximumAge: RETRY_MAXIMUM_AGE_MS }), LOCATION_WAIT_MS);
};

/**
 * Nung ngày giờ + toạ độ + người chụp vào ảnh vừa chụp, giống ảnh xác nhận vị
 * trí tủ lạnh: dựng `PhotoWatermark` ở khung ẩn đủ kích thước rồi chụp lại bằng
 * `ViewShot`.
 *
 * Màn gọi phải render `stamper`. `stamp` trả `null` khi lỗi / quá giờ — màn gọi
 * tự quyết dùng ảnh gốc, vì mất ảnh vừa chụp còn tệ hơn ảnh thiếu thông tin.
 */
export function usePhotoStamper() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const [isStamping, setIsStamping] = useState(false);
  const [job, setJob] = useState<StampJob | null>(null);
  const shotRef = useRef<ViewShotRef | null>(null);
  const doneRef = useRef<((uri?: string | null) => void) | null>(null);

  const render = (input: StampPhotoInput, lines: WatermarkLines) =>
    new Promise<string | null>((resolve) => {
      const finish = (uri?: string | null) => {
        if (doneRef.current !== finish) return;
        doneRef.current = null;
        clearTimeout(timer);
        setJob(null);
        resolve(uri || null);
      };
      const timer = setTimeout(() => finish(null), STAMP_TIMEOUT_MS);

      doneRef.current = finish;
      setJob({
        uri: input.uri,
        ...getWatermarkFrame(input.width, input.height),
        lines,
      });
    });

  const handleImageLoad = () => {
    const finish = doneRef.current;
    // Đợi một khung hình để ảnh vẽ lên view rồi mới chụp.
    requestAnimationFrame(async () => {
      try {
        finish?.(await shotRef.current?.capture?.());
      } catch (err) {
        error("[usePhotoStamper] capture error", err);
        finish?.(null);
      }
    });
  };

  /** `takenAt` là lúc chụp xong — giờ nung lên ảnh không phải lúc gửi. */
  const stamp = async (
    input: StampPhotoInput,
    locating: StampLocating | null,
    takenAt = new Date(),
  ): Promise<string | null> => {
    setIsStamping(true);
    try {
      const [coordinates, accountName] = await Promise.all([
        waitCoordinates(locating),
        loadWatermarkAccountName(),
      ]);
      const address = coordinates
        ? await reverseGeocode(coordinates.lat, coordinates.lng)
        : null;
      const uri = await render(
        input,
        {
          timestamp: formatStampTime(takenAt),
          address: address ?? undefined,
          coordinates: coordinates
            ? `${coordinates.lat}, ${coordinates.lng}`
            : "Không lấy được toạ độ",
          account: accountName ? `Người chụp: ${accountName}` : "",
        },
      );

      if (!uri) warn("[usePhotoStamper] Không nung được thông tin vào ảnh");
      return uri;
    } finally {
      setIsStamping(false);
    }
  };

  const stamper = (
    <>
      <Modal visible={isStamping} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.root}>
          <View style={styles.box}>
            <ActivityIndicator color={c.red} />
            <Text style={styles.text}>Đang gắn thời gian, vị trí vào ảnh...</Text>
          </View>
        </View>
      </Modal>

      {/*
        Bản full-size để ViewShot chụp: ViewShot chụp đúng bằng layout của view.
        Đẩy ra ngoài màn thay vì opacity 0 vì view trong suốt chụp ra ảnh trắng.
      */}
      {job ? (
        <View style={styles.captureHost} pointerEvents="none">
          <ViewShot
            ref={shotRef}
            options={{
              format: "jpg",
              quality: 0.8,
              result: "tmpfile",
            }}
          >
            {/* ViewShot ra ảnh = cỡ layout × mật độ màn hình (iOS bỏ qua
                option width/height theo pixel), nên dựng khung theo point để
                ảnh ra đúng số pixel — không thì máy 3x ra ảnh gấp 3 cạnh. */}
            <PhotoWatermark
              uri={job.uri}
              width={job.width / PixelRatio.get()}
              height={job.height / PixelRatio.get()}
              lines={job.lines}
              onLoad={handleImageLoad}
            />
          </ViewShot>
        </View>
      ) : null}
    </>
  );

  return { stamp, stamper };
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    box: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    text: {
      marginLeft: 10,
      fontSize: 14,
      color: c.text,
    },
    captureHost: {
      position: "absolute",
      left: -10000,
      top: 0,
    },
  });
