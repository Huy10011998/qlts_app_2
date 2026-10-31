/**
 * Âm lịch Việt Nam (múi giờ +7) theo thuật toán của Hồ Ngọc Đức — tính ngay trên
 * máy, không cần API. Lịch công việc dùng cho ngày âm trên thẻ ngày và ngày lễ.
 */

const TIME_ZONE = 7;
const { floor, sin, PI } = Math;
const DR = PI / 180;

/** Số ngày Julius của một ngày dương lịch. */
const jdFromDate = (dd: number, mm: number, yy: number) => {
  const a = floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  const jd =
    dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - floor(y / 100) + floor(y / 400) - 32045;
  return jd < 2299161 ? dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083 : jd;
};

/** Ngày (số Julius) của lần sóc thứ k tính từ 1/1/1900. */
const getNewMoonDay = (k: number) => {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const jd1 =
    2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3 +
    0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 =
    (0.1734 - 0.000393 * T) * sin(M * DR) + 0.0021 * sin(2 * DR * M) -
    0.4068 * sin(Mpr * DR) + 0.0161 * sin(DR * 2 * Mpr) -
    0.0004 * sin(DR * 3 * Mpr) +
    0.0104 * sin(DR * 2 * F) - 0.0051 * sin(DR * (M + Mpr)) -
    0.0074 * sin(DR * (M - Mpr)) + 0.0004 * sin(DR * (2 * F + M)) -
    0.0004 * sin(DR * (2 * F - M)) - 0.0006 * sin(DR * (2 * F + Mpr)) +
    0.001 * sin(DR * (2 * F - Mpr)) + 0.0005 * sin(DR * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return floor(jd1 + C1 - deltaT + 0.5 + TIME_ZONE / 24);
};

/** Cung hoàng đạo (0–11) của mặt trời lúc đầu ngày Julius `jdn`. */
const getSunLongitude = (jdn: number) => {
  const T = (jdn - 2451545.5 - TIME_ZONE / 24) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * sin(DR * M) +
    (0.019993 - 0.000101 * T) * sin(DR * 2 * M) +
    0.00029 * sin(DR * 3 * M);
  let L = (L0 + DL) * DR;
  L -= PI * 2 * floor(L / (PI * 2));
  return floor((L / PI) * 6);
};

/** Ngày bắt đầu tháng 11 âm (tháng có Đông chí) của năm `yy`. */
const getLunarMonth11 = (yy: number) => {
  const k = floor((jdFromDate(31, 12, yy) - 2415021) / 29.530588853);
  const nm = getNewMoonDay(k);
  return getSunLongitude(nm) >= 9 ? getNewMoonDay(k - 1) : nm;
};

/** Vị trí tháng nhuận tính từ tháng 11 âm `a11` (năm có 13 tháng). */
const getLeapMonthOffset = (a11: number) => {
  const k = floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last;
  let i = 1;
  let arc = getSunLongitude(getNewMoonDay(k + i));
  do {
    last = arc;
    i++;
    arc = getSunLongitude(getNewMoonDay(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
};

export type AmLich = { day: number; month: number; year: number; leap: boolean };

// Lưới tháng hỏi lại cùng ngày mỗi lần vẽ.
const cache = new Map<string, AmLich>();

export const getAmLich = (date: Date): AmLich => {
  const dd = date.getDate();
  const mm = date.getMonth() + 1;
  const yy = date.getFullYear();
  const key = `${yy}-${mm}-${dd}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const dayNumber = jdFromDate(dd, mm, yy);
  const k = floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1);
  if (monthStart > dayNumber) monthStart = getNewMoonDay(k);

  let a11 = getLunarMonth11(yy);
  let b11 = a11;
  let year: number;
  if (a11 >= monthStart) {
    year = yy;
    a11 = getLunarMonth11(yy - 1);
  } else {
    year = yy + 1;
    b11 = getLunarMonth11(yy + 1);
  }

  const diff = floor((monthStart - a11) / 29);
  let leap = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapOffset = getLeapMonthOffset(a11);
    if (diff >= leapOffset) {
      month = diff + 10;
      leap = diff === leapOffset;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) year -= 1;

  const result = { day: dayNumber - monthStart + 1, month, year, leap };
  cache.set(key, result);
  return result;
};

/** "18/9" · tháng nhuận "18/6 nhuận". */
export const formatAmLich = (am: AmLich) => `${am.day}/${am.month}${am.leap ? " nhuận" : ""}`;
const LE_DUONG_LICH: Record<string, string> = {
  "1/1": "Tết Dương lịch",
  "30/4": "Giải phóng miền Nam",
  "1/5": "Quốc tế Lao động",
  "2/9": "Quốc khánh",
};

/**
 * Ngày lễ theo Bộ luật Lao động (Điều 112), chỉ những ngày cố định: Tết Âm lịch
 * ghi Giao thừa + mùng 1–3, Quốc khánh chỉ 2/9 — số ngày nghỉ thêm do Chính phủ
 * chốt từng năm nên không đoán.
 */
export const getNgayLe = (date: Date): string | null => {
  const duong = LE_DUONG_LICH[`${date.getDate()}/${date.getMonth() + 1}`];
  if (duong) return duong;

  const am = getAmLich(date);
  if (!am.leap && am.month === 1 && am.day <= 3) return `Mùng ${am.day} Tết`;
  if (!am.leap && am.month === 3 && am.day === 10) return "Giỗ Tổ Hùng Vương";

  const next = getAmLich(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1));
  return !next.leap && next.month === 1 && next.day === 1 ? "Giao thừa" : null;
};
