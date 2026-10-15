import React from "react";
import { UnscaledText } from "../../utils/helpers/textScaling";
import { Image, StyleSheet, View } from "react-native";

/** Cạnh dài tối đa của ảnh nung watermark — cùng mức nén BE khuyến nghị. */
export const WATERMARK_MAX_DIMENSION = 1600;

export type WatermarkLines = {
  /** Dòng đậm trên cùng: ngày giờ chụp. */
  timestamp: string;
  /** Địa chỉ tra từ toạ độ; rỗng (không mạng / không tra được) thì ẩn. */
  address?: string;
  /** Toạ độ GPS, hoặc câu báo không lấy được. Có địa chỉ thì in nhỏ dưới nó. */
  coordinates: string;
  /** Đối tượng đang chụp (tên tủ...); rỗng thì ẩn dòng này. */
  subject?: string;
  /** Tài khoản đang chụp; rỗng thì ẩn dòng này. */
  account?: string;
};

/**
 * Kích thước khung nung watermark, suy từ ảnh gốc và giới hạn cạnh dài.
 *
 * Phải tính trước vì `ViewShot` chụp đúng bằng layout của view: để view co theo
 * màn hình thì ảnh gửi lên sẽ bé bằng ô preview.
 */
export const getWatermarkFrame = (
  photoWidth?: number,
  photoHeight?: number,
) => {
  const width = photoWidth && photoWidth > 0 ? photoWidth : 1200;
  const height = photoHeight && photoHeight > 0 ? photoHeight : 1600;
  const scale = Math.min(1, WATERMARK_MAX_DIMENSION / Math.max(width, height));

  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

type PhotoWatermarkProps = {
  uri: string;
  width: number;
  height: number;
  lines: WatermarkLines;
  /** Ảnh đã vẽ xong — chụp `ViewShot` sớm hơn thì ra khung trống. */
  onLoad?: () => void;
};

/**
 * Ảnh chụp kèm dải thông tin nung thẳng vào ảnh.
 *
 * Dùng cho cả hai việc — preview trên màn và bản full-size mà `ViewShot` chụp
 * lại để gửi lên server — nên mọi cỡ chữ đều tính theo `width`: cùng component
 * render ở 330px (preview) và 1600px (ảnh gửi) cho ra bố cục giống hệt nhau,
 * cái user thấy đúng là cái được gửi đi.
 */
export default function PhotoWatermark({
  uri,
  width,
  height,
  lines,
  onLoad,
}: PhotoWatermarkProps) {
  const unit = width / 100;

  return (
    <View style={{ width, height }}>
      {/* Android mặc định cho ảnh hiện dần 300ms: chụp ViewShot ngay sau
          onLoad thì ảnh còn nửa trong suốt → JPG tối thui. Tắt hẳn. */}
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        fadeDuration={0}
        onLoad={onLoad}
      />

      <View
        style={[
          styles.banner,
          {
            paddingHorizontal: unit * 3,
            paddingVertical: unit * 2.5,
            borderLeftWidth: unit * 0.9,
          },
        ]}
      >
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.timestamp, { fontSize: unit * 4.4 }]}
        >
          {lines.timestamp}
        </UnscaledText>
        {lines.address ? (
          <UnscaledText
            allowFontScaling={false}
            numberOfLines={2}
            style={[
              styles.detail,
              { fontSize: unit * 3.4, marginTop: unit * 0.8 },
            ]}
          >
            {lines.address}
          </UnscaledText>
        ) : null}
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            lines.address ? styles.minor : styles.detail,
            {
              fontSize: unit * (lines.address ? 2.8 : 3.4),
              marginTop: unit * (lines.address ? 0.4 : 0.8),
            },
          ]}
        >
          {lines.coordinates}
        </UnscaledText>
        {lines.subject ? (
          <UnscaledText
            allowFontScaling={false}
            numberOfLines={2}
            style={[
              styles.detail,
              { fontSize: unit * 3.4, marginTop: unit * 0.4 },
            ]}
          >
            {lines.subject}
          </UnscaledText>
        ) : null}
        {lines.account ? (
          <UnscaledText
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.detail,
              { fontSize: unit * 3.4, marginTop: unit * 0.4 },
            ]}
          >
            {lines.account}
          </UnscaledText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderLeftColor: "#E31E24",
  },
  timestamp: {
    color: "#fff",
    fontWeight: "800",
  },
  detail: {
    color: "rgba(255,255,255,0.92)",
    fontWeight: "600",
  },
  minor: {
    color: "rgba(255,255,255,0.78)",
    fontWeight: "500",
  },
});
