import React from "react";
import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { C } from "../../utils/helpers/colors";

// Ảnh phối cảnh mặt tiền nhà máy (cholimex-company2.jpg, 1920×1080).
const PHOTO_ASPECT = 1920 / 1080;
// Chỉ lấy khúc mặt tiền bên trái biển Cholimex (31/10): bề ngang màn ứng với
// 5%–36% bề ngang ảnh, mép trên ở mép trên dải sóng đỏ-vàng trên nóc (28.5%
// chiều cao ảnh). Không còn trời, và biển (bắt đầu ở 37.5%) không lọt vào —
// trước đó biển nằm đúng dòng thanh trạng thái, bị Dynamic Island và đồng hồ che.
const PHOTO_LEFT = 0.05;
const PHOTO_VISIBLE_WIDTH = 0.31;
const PHOTO_FACADE_TOP = 0.285;

/** Cao dải đỏ ở đáy header — khung header chừa `paddingBottom` đúng bằng này. */
export const HEADER_RED_EDGE = 3;

/**
 * Nền ảnh nhà máy + lớp tối + dải đỏ đáy của mọi header (Trang chủ, màn gốc các
 * tab, màn con, header trong modal). Đặt làm con đầu tiên của khung header có
 * `overflow: hidden` và `paddingBottom: HEADER_RED_EDGE`.
 *
 * Dải đỏ là View vẽ đè, không dùng `borderBottom` của khung: trên iOS ảnh con
 * vẽ đè lên viền của khung cha nên viền đỏ bị che mất.
 *
 * Kích thước và vị trí ảnh chỉ theo bề ngang màn, không theo header đang vẽ,
 * nên header nào cũng thấy cùng một khúc ảnh — chuyển màn ảnh không nhảy,
 * header thấp hơn chỉ cắt bớt phần dưới.
 */
export default function HeaderPhotoBackground() {
  const { width: windowWidth } = useWindowDimensions();
  const photoWidth = windowWidth / PHOTO_VISIBLE_WIDTH;
  const photoHeight = photoWidth / PHOTO_ASPECT;

  return (
    <>
      <Image
        source={require("../../assets/images/cholimex-company2.jpg")}
        style={[
          styles.photo,
          {
            width: photoWidth,
            height: photoHeight,
            left: -photoWidth * PHOTO_LEFT,
            top: -photoHeight * PHOTO_FACADE_TOP,
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.35)"]}
        locations={[0, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.redEdge} />
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    position: "absolute",
  },
  redEdge: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: HEADER_RED_EDGE,
    backgroundColor: C.red,
  },
});
