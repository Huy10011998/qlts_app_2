/**
 * Thứ tự các khối (Card) trên Trang chủ — do user tự kéo thả, lưu riêng theo
 * từng tài khoản.
 *
 * Tách khỏi component vì phần khó nằm hết ở đây: thứ tự lưu trong máy có thể là
 * của bản app cũ (thiếu khối mới), có thể chứa khối đã bị xoá, và lúc kéo thì
 * user chỉ thấy những khối đang hiện — khối bị ẩn vì thiếu quyền hoặc chưa có dữ
 * liệu vẫn phải giữ đúng chỗ để lần sau hiện lại không nhảy lung tung.
 */
export const HOME_BLOCK_ORDER_KEY = "@home:blockOrder";
const HOME_BLOCK_ORDER_USER_KEY = `${HOME_BLOCK_ORDER_KEY}:user`;

export type HomeBlockKey =
  | "stats"
  | "shortcuts"
  | "assetStructure"
  | "attendance"
  | "utilities";

/** Thứ tự mặc định, cũng là danh sách khối hợp lệ duy nhất. */
export const DEFAULT_HOME_BLOCK_ORDER: HomeBlockKey[] = [
  "stats",
  "shortcuts",
  "assetStructure",
  "attendance",
  "utilities",
];

/**
 * Tên và icon của từng khối, dùng cho bảng sắp xếp.
 *
 * Cố tình viết thường (không phải chữ in như tiêu đề ngoài Trang chủ) và ngắn hơn
 * — trong một danh sách 5 dòng thì chữ in hoa toàn bộ đọc mệt và dễ tràn dòng.
 */
export const HOME_BLOCK_META: Record<
  HomeBlockKey,
  { label: string; iconName: string }
> = {
  stats: { label: "Số liệu toàn công ty", iconName: "stats-chart-outline" },
  shortcuts: { label: "Truy cập nhanh", iconName: "flash-outline" },
  // Một khối, ba trang cuộn ngang: cơ cấu máy móc · tăng trưởng luỹ kế · cơ cấu
  // thiết bị CNTT. Bảng sắp xếp chỉ kéo được cả khối, không kéo từng trang.
  assetStructure: {
    label: "Cơ cấu tài sản",
    iconName: "pie-chart-outline",
  },
  attendance: { label: "Điểm danh nhân sự", iconName: "people-outline" },
  utilities: {
    label: "Tiêu thụ điện · nước · hơi",
    iconName: "speedometer-outline",
  },
};

const KNOWN_HOME_BLOCK_KEYS = new Set<string>(DEFAULT_HOME_BLOCK_ORDER);

export const isHomeBlockKey = (value: string): value is HomeBlockKey =>
  KNOWN_HOME_BLOCK_KEYS.has(value);

export const getHomeBlockOrderKey = (userName: string | null) => {
  const normalizedUserName = userName?.trim().toLowerCase();

  if (!normalizedUserName) return HOME_BLOCK_ORDER_KEY;

  return `${HOME_BLOCK_ORDER_USER_KEY}:${encodeURIComponent(
    normalizedUserName
  )}`;
};

// Khối mới của bản app sau phải chèn vào đúng chỗ mặc định của nó, không dồn hết
// xuống cuối: user đã sắp xong rồi thì một khối lạ hiện ở đáy trông như lỗi.
const insertByDefaultNeighbour = (order: HomeBlockKey[], key: HomeBlockKey) => {
  const defaultIndex = DEFAULT_HOME_BLOCK_ORDER.indexOf(key);

  for (let index = defaultIndex - 1; index >= 0; index -= 1) {
    const position = order.indexOf(DEFAULT_HOME_BLOCK_ORDER[index]);

    if (position >= 0) {
      order.splice(position + 1, 0, key);
      return;
    }
  }

  order.unshift(key);
};

/** Lọc rác trong dữ liệu đã lưu và bù lại những khối còn thiếu. */
export const normalizeHomeBlockOrder = (value: unknown): HomeBlockKey[] => {
  const seen = new Set<HomeBlockKey>();
  const order: HomeBlockKey[] = [];

  if (Array.isArray(value)) {
    value.forEach((key) => {
      if (typeof key !== "string") return;
      if (!KNOWN_HOME_BLOCK_KEYS.has(key)) return;
      if (seen.has(key as HomeBlockKey)) return;

      seen.add(key as HomeBlockKey);
      order.push(key as HomeBlockKey);
    });
  }

  DEFAULT_HOME_BLOCK_ORDER.forEach((key) => {
    if (seen.has(key)) return;

    insertByDefaultNeighbour(order, key);
  });

  return order;
};

type MoveHomeBlockArgs = {
  /** Thứ tự đầy đủ đang lưu, gồm cả khối đang bị ẩn. */
  order: HomeBlockKey[];
  /** Các khối user thật sự thấy, theo đúng thứ tự trên màn hình. */
  visibleKeys: HomeBlockKey[];
  fromIndex: number;
  toIndex: number;
};

/**
 * Dịch một khối trong danh sách đang hiện, rồi chiếu kết quả về thứ tự đầy đủ.
 *
 * Cách chiếu: gắn khối vừa kéo ngay sau khối đứng trước nó trong danh sách hiện
 * (hoặc ngay trước khối đứng sau, nếu nó lên đầu). Nhờ vậy những khối đang ẩn
 * vẫn nằm nguyên tương đối với các khối còn lại.
 */
export const moveHomeBlock = ({
  order,
  visibleKeys,
  fromIndex,
  toIndex,
}: MoveHomeBlockArgs): HomeBlockKey[] => {
  if (fromIndex === toIndex) return order;
  if (fromIndex < 0 || fromIndex >= visibleKeys.length) return order;
  if (toIndex < 0 || toIndex >= visibleKeys.length) return order;

  const movedKey = visibleKeys[fromIndex];

  if (!order.includes(movedKey)) return order;

  const nextVisibleKeys = [...visibleKeys];
  nextVisibleKeys.splice(fromIndex, 1);
  nextVisibleKeys.splice(toIndex, 0, movedKey);

  const rest = order.filter((key) => key !== movedKey);
  const previousKey = toIndex > 0 ? nextVisibleKeys[toIndex - 1] : null;

  if (previousKey) {
    const position = rest.indexOf(previousKey);

    if (position >= 0) {
      return [
        ...rest.slice(0, position + 1),
        movedKey,
        ...rest.slice(position + 1),
      ];
    }
  }

  const nextKey = nextVisibleKeys[toIndex + 1] ?? null;
  const nextPosition = nextKey ? rest.indexOf(nextKey) : -1;
  const insertAt = nextPosition >= 0 ? nextPosition : 0;

  return [...rest.slice(0, insertAt), movedKey, ...rest.slice(insertAt)];
};
