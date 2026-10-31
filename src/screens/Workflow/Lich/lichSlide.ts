import { Animated } from "react-native";

// Đang trượt thì bỏ qua lượt bấm / vuốt kế: lượt đó còn giữ kỳ cũ nên sẽ đổi trùng.
let sliding = false;

/**
 * Sang kỳ khác như lịch điện thoại: nội dung trượt hẳn ra phía đi, đổi kỳ, rồi
 * kỳ mới trượt vào từ phía đối diện. Dùng chung cho vuốt (`LichSwipeArea`) và
 * nút ‹ › — tháng 4–6 hàng cao thấp khác nhau, trượt thì không thấy lưới nhảy.
 * Trả `false` khi bỏ qua vì lượt trước chưa trượt xong.
 */
export const slideToPeriod = (
  translateX: Animated.Value,
  width: number,
  step: 1 | -1,
  onChange: (step: 1 | -1) => void,
) => {
  if (sliding) return false;
  sliding = true;
  Animated.timing(translateX, {
    toValue: -step * width,
    duration: 150,
    useNativeDriver: true,
  }).start(() => {
    sliding = false;
    onChange(step);
    // Kỳ mới vào từ phía đối diện, đi nửa quãng cho nhanh mắt.
    translateX.setValue(step * width * 0.4);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
      speed: 16,
    }).start();
  });
  return true;
};
