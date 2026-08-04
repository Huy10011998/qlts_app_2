/**
 * Phần toán của cử chỉ kéo thả khối Trang chủ, tách khỏi component để test được
 * mà không cần dựng PanResponder.
 *
 * Mọi hàm ở đây làm việc trên "mốc lúc bắt đầu kéo": chiều cao và mép trên của
 * từng khối được chốt lại ngay khi user chạm tay nắm, sau đó chỉ có khối đang kéo
 * là dịch thật, các khối khác chỉ dịch phần bù. Các khối cao thấp khác nhau nên
 * không thể quy về một chiều cao chung.
 */

/** Mép trên của từng khối, tính dồn từ chiều cao đã đo bằng `onLayout`. */
export const buildBlockOffsets = (heights: number[]) => {
  const offsets: number[] = [];
  let cursor = 0;

  heights.forEach((height) => {
    offsets.push(cursor);
    cursor += height;
  });

  return offsets;
};

type ResolveDropIndexArgs = {
  offsets: number[];
  heights: number[];
  fromIndex: number;
  /** Khoảng đã kéo (đã cộng phần trang tự cuộn). */
  translateY: number;
};

/**
 * Ô mà khối đang kéo sẽ rơi vào: so tâm khối với điểm giữa của ô liền kề, và chỉ
 * nhích một ô mỗi lần để thứ tự không nhảy vọt khi kéo nhanh qua khối thấp.
 */
export const resolveDropIndex = ({
  offsets,
  heights,
  fromIndex,
  translateY,
}: ResolveDropIndexArgs) => {
  const center = offsets[fromIndex] + heights[fromIndex] / 2 + translateY;
  let targetIndex = fromIndex;

  while (targetIndex > 0) {
    const previousIndex = targetIndex - 1;
    const previousMiddle =
      offsets[previousIndex] + heights[previousIndex] / 2;

    if (center >= previousMiddle) break;

    targetIndex = previousIndex;
  }

  while (targetIndex < heights.length - 1) {
    const nextIndex = targetIndex + 1;
    const nextMiddle = offsets[nextIndex] + heights[nextIndex] / 2;

    if (center <= nextMiddle) break;

    targetIndex = nextIndex;
  }

  return targetIndex;
};

type BlockShiftArgs = {
  index: number;
  fromIndex: number;
  toIndex: number;
  movedHeight: number;
};

/** Khoảng mà một khối *không* bị kéo phải nhường chỗ. */
export const getBlockShift = ({
  index,
  fromIndex,
  toIndex,
  movedHeight,
}: BlockShiftArgs) => {
  if (index === fromIndex) return 0;

  if (toIndex > fromIndex && index > fromIndex && index <= toIndex) {
    return -movedHeight;
  }

  if (toIndex < fromIndex && index >= toIndex && index < fromIndex) {
    return movedHeight;
  }

  return 0;
};
