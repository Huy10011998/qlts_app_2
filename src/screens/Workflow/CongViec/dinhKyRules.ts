import { addDays, formatDay, formatTime, startOfDay } from "../shared/workflowDate";
import { CV_DINH_KY_MAX_LAN } from "../shared/workflowConstants";

/**
 * Luật sinh định kỳ của server (usp_CV_SinhNgayDinhKy + usp_CV_Luu, mục 4 của
 * 4-Mobile-CongViec) — chép lại ở app CHỈ để xem trước các lần trên form và
 * chặn sớm trường hợp không sinh ra lần nào. Server mới là nơi sinh thật.
 *
 *   · Ngày các lần tính từ Ngày bắt đầu. Phần NGÀY của Từ / Đến không dùng — chỉ
 *     lấy GIỜ của Từ và THỜI LƯỢNG (Đến - Từ) cho mọi lần.
 *   · Ngày : bắt đầu, +N ngày, +2N ngày...
 *   · Tuần : từ tuần (T2 → CN) chứa ngày bắt đầu, cứ N tuần, lấy các thứ đã chọn;
 *            ngày trước ngày bắt đầu trong tuần đầu bị bỏ.
 *   · Tháng: cùng ngày trong tháng với ngày bắt đầu, cứ N tháng; tháng thiếu ngày
 *            đó lấy ngày cuối tháng, tháng sau lại về ngày gốc (không trôi).
 *   · Năm  : cùng ngày + tháng, cứ N năm; 29/02 → 28/02 năm không nhuận.
 *   · Kết thúc: lần có NGÀY <= ngày kết thúc vẫn tạo, HOẶC đủ số lần; tối đa 366.
 */

export type DinhKyInput = {
  kieuLap: number;
  moiN: number;
  /** T2 = 2 ... CN = 8. */
  thuTrongTuan: number[];
  ngayBatDau: Date;
  ketThucNgay: Date | null;
  soLan: number | null;
};

/** Ngăn vòng lặp vô tận khi dữ liệu lạ (vd ngày kết thúc rất xa mà không có lần nào khớp). */
const MAX_STEPS = 5000;

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** Ngày `day` của tháng (year, month), tháng thiếu ngày đó thì lấy ngày cuối tháng. */
const clampedDate = (year: number, month: number, day: number) => {
  const first = new Date(year, month, 1);
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(day, daysInMonth(first.getFullYear(), first.getMonth())),
  );
};

/**
 * Ngày (00:00) của các lần sẽ sinh. Sinh tối đa `limit` lần — mặc định 367 để
 * nơi gọi biết được trường hợp vượt trần 366.
 */
export const buildDinhKyDates = (
  input: DinhKyInput,
  limit = CV_DINH_KY_MAX_LAN + 1,
): Date[] => {
  const moiN = Math.floor(Number(input.moiN));
  if (!(moiN >= 1)) return [];

  const start = startOfDay(input.ngayBatDau);
  const end = input.ketThucNgay ? startOfDay(input.ketThucNgay) : null;
  const soLan = input.soLan != null ? Math.floor(Number(input.soLan)) : null;
  if (!end && !(soLan != null && soLan >= 1)) return [];

  const maxCount = soLan != null ? Math.min(soLan, limit) : limit;
  const dates: Date[] = [];

  /** Thêm 1 lần; trả false khi đã đủ / đã quá ngày kết thúc → dừng sinh. */
  const push = (date: Date) => {
    if (end && date > end) return false;
    dates.push(date);
    return dates.length < maxCount;
  };

  switch (input.kieuLap) {
    case 1: {
      for (let k = 0; k < MAX_STEPS; k++) {
        if (!push(addDays(start, k * moiN))) break;
      }
      break;
    }
    case 2: {
      const offsets = Array.from(new Set(input.thuTrongTuan))
        .filter((thu) => thu >= 2 && thu <= 8)
        .map((thu) => thu - 2)
        .sort((a, b) => a - b);
      if (!offsets.length) return [];

      const weekStart = addDays(start, -((start.getDay() + 6) % 7));
      let done = false;
      for (let w = 0; w < MAX_STEPS && !done; w++) {
        const base = addDays(weekStart, w * 7 * moiN);
        for (const offset of offsets) {
          const date = addDays(base, offset);
          if (date < start) continue;
          if (!push(date)) {
            done = true;
            break;
          }
        }
      }
      break;
    }
    case 3: {
      for (let k = 0; k < MAX_STEPS; k++) {
        const date = clampedDate(start.getFullYear(), start.getMonth() + k * moiN, start.getDate());
        if (!push(date)) break;
      }
      break;
    }
    case 4: {
      for (let k = 0; k < MAX_STEPS; k++) {
        const date = clampedDate(start.getFullYear() + k * moiN, start.getMonth(), start.getDate());
        if (!push(date)) break;
      }
      break;
    }
    default:
      return [];
  }

  return dates;
};

const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** "T5 08/10/2026". */
export const formatDinhKyDate = (date: Date) => `${THU[date.getDay()]} ${formatDay(date)}`;

/**
 * Giờ của mỗi lần: giờ của Từ → giờ của Đến, kèm số ngày nếu kéo qua ngày
 * (thời lượng giữ nguyên cho mọi lần).
 */
export const formatDinhKyTime = (tuNgay: Date | null, denNgay: Date | null) => {
  if (!tuNgay || !denNgay) return "";
  const days = Math.round((startOfDay(denNgay).getTime() - startOfDay(tuNgay).getTime()) / 86400000);
  return `${formatTime(tuNgay)} → ${formatTime(denNgay)}${days > 0 ? ` (sau ${days} ngày)` : ""}`;
};

/** Lỗi theo số lần sinh được, null = hợp lệ. */
export const validateDinhKyDates = (dates: Date[]) => {
  if (!dates.length) {
    return "Định kỳ: không sinh ra lần nào — kiểm tra ngày bắt đầu, ngày kết thúc hoặc thứ trong tuần.";
  }
  if (dates.length > CV_DINH_KY_MAX_LAN) {
    return `Định kỳ vượt ${CV_DINH_KY_MAX_LAN} lần — rút ngắn ngày kết thúc hoặc dùng số lần.`;
  }
  return null;
};
