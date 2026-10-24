import type {
  FlowBuoc,
  FlowCongViecLink,
  FlowLuatNguoi,
  FlowNguoiDuyet,
  FlowNguoiDuyetCu,
  FlowTienTrinh,
  FlowTraBuoc,
} from "../../../types/index";
import {
  CV_TRANG_THAI_HUY,
  FLOW_BUOC_KHONG_Y_KIEN,
  FLOW_KET_QUA,
  FLOW_TRA_BUOC_COLOR,
  getCongViecTrangThai,
} from "../shared/workflowConstants";
import { formatBeDate, parseBeDate } from "../shared/workflowDate";
import { getFlowBuocTinhTrangHienThi } from "./flowRules";

/**
 * Sơ đồ ngang của 1 phiếu (mục 6, web DataFlow_QuyTrinhDialog 12/10/2026).
 *   · Cột: 0 = Lập phiếu, i = bước lớn thứ i, thêm cột Công việc nếu có.
 *   · Dòng = LƯỢT CHẠY: n lần trả bước → n + 1 dòng, mỗi bước luôn ở đúng cột.
 *   · Dòng cũ dựng lại kết quả lúc đó từ nguoiDuyets + nguoiDuyetCus.
 * Toàn bộ là hàm thuần — màn chỉ vẽ.
 */

export type FlowPointState = "done" | "doing" | "wait" | "reject" | "skip" | "tra";

/** Màu chấm tròn (mục 6c, PHỤ LỤC); wait là viền đứt của chấm trắng. */
export const FLOW_POINT_COLOR: Record<FlowPointState, string> = {
  done: "#2eb85c",
  doing: "#2f6fb2",
  wait: "#b0b8c1",
  reject: "#c62828",
  skip: "#9da5b1",
  tra: FLOW_TRA_BUOC_COLOR,
};

/** Chip trạng thái — nền / chữ (PHỤ LỤC, web data-flow.css .df-st-*). "Chưa xử lý" dùng wait. */
export const FLOW_CHIP_COLOR: Record<FlowPointState, { bg: string; text: string }> = {
  wait: { bg: "#eef1f4", text: "#5c6873" },
  doing: { bg: "#e3edf9", text: "#2f6fb2" },
  done: { bg: "#e3f5e9", text: "#1e7e3e" },
  reject: { bg: "#fdecea", text: "#c62828" },
  skip: { bg: "#eef0f2", text: "#5c6873" },
  tra: { bg: "#fff4d6", text: "#b26a00" },
};

/** Đường nối 2 điểm: xanh nếu điểm trái Đã duyệt / Không ý kiến, còn lại xám (PHỤ LỤC). */
export const FLOW_LINE_COLOR = { passed: "#2eb85c", other: "#d5dae0" };

export type FlowColumn =
  | { kind: "lap"; key: string }
  | { kind: "buoc"; key: string; buoc: FlowBuoc; children: FlowBuoc[] }
  | { kind: "congViec"; key: string; link: FlowCongViecLink };

export type FlowChildDot = { id: number; state: FlowPointState };

export type FlowPoint = {
  key: string;
  /** Chỉ số lượt chạy, 0 = Lần 1. */
  run: number;
  col: number;
  column: FlowColumn;
  state: FlowPointState;
  /** Chấm nhỏ của từng bước con (rỗng = bước đơn). */
  childDots: FlowChildDot[];
  /** "x/n" cạnh chấm con (x = con Duyệt / Không ý kiến); null = bước đơn. */
  count: string | null;
  /** Dòng phụ dưới tên: ngày xong / trả / từ chối, "Đang xử lý", "Chờ xử lý"... */
  sub: string;
  /** Đã duyệt / Không ý kiến (khác Bỏ qua) — đường nối sang điểm kế tô xanh. */
  passed: boolean;
};

export type FlowRun = {
  index: number;
  points: FlowPoint[];
  /** Lần trả bước kết thúc lượt này (null ở lượt đang chạy). */
  traBuoc: FlowTraBuoc | null;
  isLast: boolean;
};

export type FlowDiagram = {
  columns: FlowColumn[];
  runs: FlowRun[];
};

const SKIP_LABELS = { khongYKien: "Không ý kiến", boQua: "Bỏ qua" };

/** "TEST03 - Nhân viên Test 3" → "Nhân viên Test 3" (web chỉ hiện tên). */
export const bareFlowName = (moTa: string | null | undefined) => {
  const text = (moTa ?? "").trim();
  const match = /^[A-Za-z0-9._]+ - (.+)$/.exec(text);
  return match ? match[1].trim() : text;
};

const time = (raw: unknown) => parseBeDate(raw)?.getTime() ?? null;

const stateOfTinhTrang = (tinhTrang: number): FlowPointState => {
  switch (tinhTrang) {
    case 1:
      return "doing";
    case 2:
      return "done";
    case 3:
      return "reject";
    case FLOW_BUOC_KHONG_Y_KIEN:
      return "skip";
    default:
      return "wait";
  }
};

const stateOfKetQua = (ketQua: number | null | undefined): FlowPointState => {
  switch (ketQua) {
    case FLOW_KET_QUA.Duyet:
      return "done";
    case FLOW_KET_QUA.TuChoi:
      return "reject";
    case FLOW_KET_QUA.KhongYKien:
      return "skip";
    case FLOW_KET_QUA.TraBuoc:
      return "tra";
    default:
      return "wait";
  }
};

/** Bước tinhTrang 4: có người bấm Không ý kiến thì là "Không ý kiến", không thì "Bỏ qua". */
const isKhongYKien = (buoc: FlowBuoc, nguoiDuyets: FlowNguoiDuyet[], children: FlowBuoc[] = []) => {
  const ids = new Set([buoc.id, ...children.map((child) => child.id)]);
  return nguoiDuyets.some(
    (nguoi) => ids.has(nguoi.iD_Flow_HoSo_Buoc) && nguoi.ketQua === FLOW_KET_QUA.KhongYKien,
  );
};

/**
 * Bộ dữ liệu đã sắp + tra cứu dùng chung cho sơ đồ và khung chi tiết.
 */
export const indexFlowTienTrinh = (data: FlowTienTrinh | null | undefined) => {
  const buocs = data?.buocs ?? [];
  const topSteps = buocs.filter((buoc) => buoc.buocCon == null).sort((a, b) => a.buoc - b.buoc);
  const childrenOf = (parent: FlowBuoc) =>
    buocs
      .filter((buoc) => buoc.buocCon != null && buoc.buoc === parent.buoc)
      .sort((a, b) => Number(a.buocCon) - Number(b.buocCon));
  const traBuocs = [...(data?.traBuocs ?? [])].sort((a, b) => a.lan - b.lan);
  const nguoiDuyets = data?.nguoiDuyets ?? [];
  const nguoiDuyetCus = data?.nguoiDuyetCus ?? [];
  const luatNguois = data?.luatNguois ?? [];

  /** Cột của bước lớn chứa bước `id` (bước con hay dòng cha đều về bước lớn). */
  const colOfStep = (id: number) => {
    const step = buocs.find((buoc) => buoc.id === id);
    if (!step) return -1;
    const index = topSteps.findIndex((top) => top.buoc === step.buoc);
    return index < 0 ? -1 : index + 1;
  };

  /**
   * Kết quả 1 bước ở cuối lượt `run` (mục 6e, DÒNG CŨ): bản ghi mới nhất có
   * ketQua, ngayDuyet <= ngày trả lần đó và còn hiệu lực tới lần đó (đang có
   * trong nguoiDuyets, hoặc nguoiDuyetCus có lan >= lần). null = Chưa xử lý.
   */
  const resultAt = (stepId: number, run: number): FlowNguoiDuyet | null => {
    const tra = traBuocs[run];
    const limit = time(tra?.ngayTra);
    const lan = run + 1;
    const candidates: FlowNguoiDuyet[] = [
      ...nguoiDuyets,
      ...nguoiDuyetCus.filter((nguoi: FlowNguoiDuyetCu) => nguoi.lan >= lan),
    ];
    let best: FlowNguoiDuyet | null = null;
    let bestTime = -Infinity;
    for (const nguoi of candidates) {
      if (nguoi.iD_Flow_HoSo_Buoc !== stepId || nguoi.ketQua == null) continue;
      const at = time(nguoi.ngayDuyet);
      if (at == null || (limit != null && at > limit) || at < bestTime) continue;
      best = nguoi;
      bestTime = at;
    }
    return best;
  };

  /** Mọi người từng gắn với bước (đang có + các lượt cũ), bỏ trùng tên. */
  const peopleEver = (stepId: number) => {
    const seen = new Set<string>();
    return [...nguoiDuyets, ...nguoiDuyetCus].filter((nguoi) => {
      if (nguoi.iD_Flow_HoSo_Buoc !== stepId) return false;
      const name = nguoi.iD_NhanVien_MoTa ?? nguoi.coCau_MoTa ?? "";
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  };

  return {
    buocs,
    topSteps,
    childrenOf,
    traBuocs,
    nguoiDuyets,
    nguoiDuyetCus,
    luatNguois,
    colOfStep,
    resultAt,
    peopleEver,
  };
};

type Index = ReturnType<typeof indexFlowTienTrinh>;

/** Trạng thái bước lớn ở dòng cuối (mục 6d): con từ chối → reject; cha / con đang chờ → doing. */
const lastRunState = (buoc: FlowBuoc, children: FlowBuoc[]): FlowPointState => {
  if (buoc.tinhTrang === 3 || children.some((child) => child.tinhTrang === 3)) return "reject";
  if (buoc.tinhTrang === 1 || children.some((child) => child.tinhTrang === 1)) return "doing";
  return stateOfTinhTrang(getFlowBuocTinhTrangHienThi(buoc, children));
};

const congViecState = (link: FlowCongViecLink): FlowPointState => {
  if (link.trangThai === 2) return "done";
  if (link.trangThai === CV_TRANG_THAI_HUY) return "skip";
  return "doing";
};

/** Ngày xong của bước ở dòng cuối: ngayHoanTat, thiếu thì giờ duyệt muộn nhất của bước / con. */
const doneAt = (index: Index, buoc: FlowBuoc, children: FlowBuoc[]) => {
  if (buoc.ngayHoanTat) return formatBeDate(buoc.ngayHoanTat, true);
  const ids = new Set([buoc.id, ...children.map((child) => child.id)]);
  const latest = index.nguoiDuyets.reduce<number | null>((max, nguoi) => {
    const at = ids.has(nguoi.iD_Flow_HoSo_Buoc) && nguoi.ketQua != null ? time(nguoi.ngayDuyet) : null;
    return at != null && (max == null || at > max) ? at : max;
  }, null);
  return latest != null ? formatBeDate(new Date(latest), true) : "";
};

const buildPoint = (
  index: Index,
  column: FlowColumn,
  col: number,
  run: number,
  isLast: boolean,
  ngayLap: unknown,
): FlowPoint => {
  const key = `${run}-${col}`;
  const base = { key, run, col, column, childDots: [], count: null };

  if (column.kind === "lap") {
    return { ...base, state: "done", sub: formatBeDate(ngayLap, true), passed: true };
  }

  if (column.kind === "congViec") {
    const trangThai = getCongViecTrangThai(column.link.trangThai);
    const state = congViecState(column.link);
    return { ...base, state, sub: trangThai?.label ?? "", passed: state === "done" };
  }

  const { buoc, children } = column;

  if (!isLast) {
    // DÒNG CŨ: bước bấm trả của lần này là tra, các bước khác trong dòng là done.
    const tra = index.traBuocs[run];
    const state: FlowPointState = index.colOfStep(tra.iD_Flow_HoSo_Buoc_Tu) === col ? "tra" : "done";
    if (children.length) {
      const results = children.map((child) => index.resultAt(child.id, run));
      const childDots = children.map((child, i) => ({ id: child.id, state: stateOfKetQua(results[i]?.ketQua) }));
      const doneCount = results.filter(
        (result) => result?.ketQua === FLOW_KET_QUA.Duyet || result?.ketQua === FLOW_KET_QUA.KhongYKien,
      ).length;
      const latest = results.reduce<number | null>((max, result) => {
        const at = time(result?.ngayDuyet);
        return at != null && (max == null || at > max) ? at : max;
      }, null);
      // Bị trả cũng kèm ngày (mục 6c: "1/2 · 12/10/2026 16:19").
      const sub =
        state === "tra"
          ? formatBeDate(tra.ngayTra, true)
          : latest != null
          ? formatBeDate(new Date(latest), true)
          : "";
      return { ...base, state, childDots, count: `${doneCount}/${childDots.length}`, sub, passed: state === "done" };
    }
    const sub =
      state === "tra"
        ? formatBeDate(tra.ngayTra, true)
        : formatBeDate(index.resultAt(buoc.id, run)?.ngayDuyet, true);
    return { ...base, state, sub, passed: state === "done" };
  }

  // DÒNG CUỐI: theo tinhTrang server trả.
  const state = lastRunState(buoc, children);
  const khongYKien = state === "skip" && isKhongYKien(buoc, index.nguoiDuyets, children);
  const passed = state === "done" || khongYKien;
  if (children.length) {
    const childDots = children.map((child) => ({ id: child.id, state: stateOfTinhTrang(child.tinhTrang) }));
    const doneCount = children.filter(
      (child) =>
        child.tinhTrang === 2 ||
        (child.tinhTrang === FLOW_BUOC_KHONG_Y_KIEN && isKhongYKien(child, index.nguoiDuyets)),
    ).length;
    // Xong hay bị từ chối đều kèm ngày; đang chạy / chờ chỉ "x/n" như web.
    const sub = state === "done" || state === "reject" ? doneAt(index, buoc, children) : "";
    return { ...base, state, childDots, count: `${doneCount}/${childDots.length}`, sub, passed };
  }

  let sub = "";
  if (state === "doing") sub = "Đang xử lý";
  else if (state === "wait") sub = "Chờ xử lý";
  else if (state === "skip") sub = khongYKien ? SKIP_LABELS.khongYKien : SKIP_LABELS.boQua;
  else sub = doneAt(index, buoc, []) || (state === "reject" ? "Đã từ chối" : "");
  return { ...base, state, sub, passed };
};

export const buildFlowDiagram = (
  data: FlowTienTrinh | null | undefined,
  ngayLap: unknown,
): FlowDiagram => {
  const index = indexFlowTienTrinh(data);
  const columns: FlowColumn[] = [
    { kind: "lap", key: "lap" },
    ...index.topSteps.map((buoc) => ({
      kind: "buoc" as const,
      key: `buoc-${buoc.id}`,
      buoc,
      children: index.childrenOf(buoc),
    })),
    ...(data?.congViec ? [{ kind: "congViec" as const, key: "congViec", link: data.congViec }] : []),
  ];
  const lastCol = columns.length - 1;
  const n = index.traBuocs.length;

  const runs: FlowRun[] = [];
  for (let run = 0; run <= n; run += 1) {
    const isLast = run === n;
    const startCol = run === 0 ? 0 : Math.max(1, index.colOfStep(index.traBuocs[run - 1].iD_Flow_HoSo_Buoc_Ve));
    // Lượt cũ dừng ở bước bấm trả; lượt đang chạy đi tới hết (kể cả cột Công việc).
    const endCol = isLast ? lastCol : index.colOfStep(index.traBuocs[run].iD_Flow_HoSo_Buoc_Tu);
    const safeEnd = endCol < startCol ? startCol : endCol;

    const points: FlowPoint[] = [];
    for (let col = startCol; col <= safeEnd && col <= lastCol; col += 1) {
      points.push(buildPoint(index, columns[col], col, run, isLast, ngayLap));
    }
    runs.push({ index: run, points, traBuoc: isLast ? null : index.traBuocs[run], isLast });
  }

  return { columns, runs };
};

/**
 * Điểm chọn sẵn lúc mở (mục 6e): điểm doing của dòng cuối → điểm reject →
 * Công việc → điểm xong cuối cùng.
 */
export const getInitialFlowPoint = (diagram: FlowDiagram): FlowPoint | null => {
  const last = diagram.runs[diagram.runs.length - 1];
  if (!last) return null;
  const all = diagram.runs.flatMap((run) => run.points);
  return (
    last.points.find((point) => point.state === "doing") ??
    last.points.find((point) => point.state === "reject") ??
    last.points.find((point) => point.column.kind === "congViec") ??
    [...last.points].reverse().find((point) => point.state === "done") ??
    [...all].reverse().find((point) => point.state === "done") ??
    last.points[last.points.length - 1] ??
    null
  );
};

// =====================================================
// KHUNG CHI TIẾT
// =====================================================

export type FlowDetailPerson = {
  name: string;
  coCau?: string | null;
  chiXem?: boolean;
  /** Người / nhóm khai cho bước chưa mở — vẽ mờ. */
  faded?: boolean;
};

/** Màu chip lấy theo state (FLOW_CHIP_COLOR); label có thể khác (Không ý kiến / Bỏ qua / Chưa xử lý). */
export type FlowDetailStatus = { label: string; state: FlowPointState };

export type FlowDetailRow = {
  key: string;
  label: string;
  people: FlowDetailPerson[];
  status: FlowDetailStatus;
  time: string;
  yKien: string | null;
};

export type FlowPointDetail = {
  kicker: string;
  title: string;
  status: FlowDetailStatus;
  rows: FlowDetailRow[];
  note: string | null;
  tra: FlowTraBuoc | null;
};

const POINT_LABEL: Record<FlowPointState, string> = {
  done: "Đã duyệt",
  doing: "Đang xử lý",
  wait: "Chờ xử lý",
  reject: "Đã từ chối",
  skip: SKIP_LABELS.boQua,
  tra: "Trả bước",
};

const statusOf = (state: FlowPointState, label?: string): FlowDetailStatus => ({
  label: label ?? POINT_LABEL[state],
  state,
});

const personOf = (nguoi: FlowNguoiDuyet): FlowDetailPerson => ({
  name: bareFlowName(nguoi.iD_NhanVien_MoTa) || nguoi.coCau_MoTa || "—",
  coCau: nguoi.iD_NhanVien_MoTa ? nguoi.coCau_MoTa : null,
  chiXem: !!nguoi.isChiXem,
});

const personOfLuat = (luat: FlowLuatNguoi): FlowDetailPerson => {
  const group = [
    luat.iD_PhongBan_MoTa,
    luat.iD_BoPhan_MoTa,
    luat.iD_ToDoi_MoTa,
    luat.iD_ChucVu_MoTa,
    luat.iD_ChucDanh_MoTa,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    name: bareFlowName(luat.iD_NhanVien_MoTa) || group || "—",
    coCau: luat.iD_NhanVien_MoTa ? luat.nhanVien_CoCau_MoTa : null,
    chiXem: !!luat.isChiXem,
    faded: true,
  };
};

/** Một dòng bảng ở DÒNG CUỐI: người có kết quả thì người đó, chưa thì cả danh sách. */
const lastRunRow = (index: Index, step: FlowBuoc, label: string): FlowDetailRow => {
  const people = index.nguoiDuyets.filter((nguoi) => nguoi.iD_Flow_HoSo_Buoc === step.id);
  const done = people.filter((nguoi) => nguoi.ketQua != null);
  const shown = done.length ? done : people;
  const notOpened = !people.length && !step.ngayMo;
  const state = stateOfTinhTrang(step.tinhTrang);
  const statusLabel =
    state === "skip"
      ? isKhongYKien(step, index.nguoiDuyets)
        ? SKIP_LABELS.khongYKien
        : SKIP_LABELS.boQua
      : undefined;

  return {
    key: `row-${step.id}`,
    label,
    people: notOpened
      ? index.luatNguois.filter((luat) => luat.iD_Flow_HoSo_Buoc === step.id).map(personOfLuat)
      : shown.map(personOf),
    status: statusOf(state, statusLabel),
    time: formatBeDate(done[0]?.ngayDuyet, true),
    yKien: done[0]?.yKien ?? null,
  };
};

/** Một dòng bảng ở DÒNG CŨ: dựng lại kết quả cuối lượt đó. */
const oldRunRow = (index: Index, step: FlowBuoc, label: string, run: number): FlowDetailRow => {
  const result = index.resultAt(step.id, run);
  const state = stateOfKetQua(result?.ketQua);
  const statusLabel = !result
    ? "Chưa xử lý"
    : result.ketQua === FLOW_KET_QUA.KhongYKien
    ? SKIP_LABELS.khongYKien
    : undefined;

  return {
    key: `row-${run}-${step.id}`,
    label,
    people: result ? [personOf(result)] : index.peopleEver(step.id).map(personOf),
    status: statusOf(state, statusLabel),
    time: formatBeDate(result?.ngayDuyet, true),
    yKien: result?.yKien ?? null,
  };
};

export const getFlowPointDetail = (
  data: FlowTienTrinh | null | undefined,
  point: FlowPoint,
  diagram: FlowDiagram,
): FlowPointDetail | null => {
  if (point.column.kind !== "buoc") return null;

  const index = indexFlowTienTrinh(data);
  const { buoc, children } = point.column;
  const isLast = point.run === diagram.runs.length - 1;
  const rowOf = (step: FlowBuoc, label: string) =>
    isLast ? lastRunRow(index, step, label) : oldRunRow(index, step, label, point.run);

  // "Cha có người duyệt riêng": có người / luật gắn thẳng vào dòng cha.
  const parentHasOwn =
    children.length > 0 &&
    ([...index.nguoiDuyets, ...index.nguoiDuyetCus].some((nguoi) => nguoi.iD_Flow_HoSo_Buoc === buoc.id) ||
      index.luatNguois.some((luat) => luat.iD_Flow_HoSo_Buoc === buoc.id));

  // Bước con ghi "2.1 Kế toán viên"; bước đơn chỉ ghi tên — số bước đã có ở tiêu đề khung.
  const rows = children.length
    ? [
        ...children.map((child) => rowOf(child, `${child.buoc}.${child.buocCon} ${child.ten}`)),
        ...(parentHasOwn ? [rowOf(buoc, "Duyệt bước cha")] : []),
      ]
    : [rowOf(buoc, buoc.ten)];

  return {
    kicker: isLast && point.state === "doing" ? "ĐANG Ở BƯỚC" : "BƯỚC",
    title: `${buoc.buoc}. ${buoc.ten}`,
    status: statusOf(
      point.state,
      point.state === "skip" ? (point.passed ? SKIP_LABELS.khongYKien : SKIP_LABELS.boQua) : undefined,
    ),
    rows,
    note: children.length
      ? `↳ Các bước con chạy ${buoc.loaiXuLy === 1 ? "song song" : "tuần tự"}${
          parentHasOwn ? " · bước cha duyệt sau khi các bước con xong" : ""
        }`
      : null,
    tra: point.state === "tra" ? index.traBuocs[point.run] ?? null : null,
  };
};
