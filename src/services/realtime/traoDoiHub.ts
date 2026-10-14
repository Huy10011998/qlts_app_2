import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import { setupURLPolyfill } from "react-native-url-polyfill";

import { BASE_URL } from "../../config/index";
import type { WorkflowComment } from "../../types/index";
import { readAccessToken } from "../auth/tokenStore";
import { refreshTokenFlow, shouldRefreshAccessToken } from "../data/httpClient";
import { warn } from "../../utils/Logger";

/**
 * Hub bình luận realtime (7-Mobile-Realtime-BinhLuan): bình luận người khác
 * gửi hiện ngay + "{Tên} đang nhập". Đọc / gửi bình luận vẫn qua API cũ — mất
 * kết nối thì khung bình luận chạy như trước (kéo để nạp lại).
 *
 * Cả app dùng 1 kết nối: mở khi có khung bình luận đầu tiên, đóng khi khung
 * cuối cùng thoát. Phòng = 1 phiếu / 1 công việc (tenBang + idHoSo).
 */

// URL sẵn có của React Native không cho gán pathname — bước negotiate của
// SignalR cần (lỗi "Cannot assign to property 'pathname'"). Không negotiate thì
// mất đường lùi về SSE / long polling khi proxy chưa mở WebSocket (mục 6).
setupURLPolyfill();

/** Cùng host với /api, bỏ "/api": https://<host>/hubs/trao-doi. */
export const TRAO_DOI_HUB_URL = `${BASE_URL.replace(/\/api\/?$/, "")}/hubs/trao-doi`;

export type BinhLuanMoiEvent = {
  tenBang: string;
  iD_HoSo: number;
  binhLuan: WorkflowComment;
};

export type DangNhapEvent = {
  tenBang: string;
  iD_HoSo: number;
  iD_NhanVien: number;
  ten: string;
  dangNhap: boolean;
};

export type TraoDoiRoomHandlers = {
  onBinhLuanMoi: (binhLuan: WorkflowComment) => void;
  onDangNhap: (event: DangNhapEvent) => void;
  /** Nối lại sau khi rớt mạng — có thể đã lỡ bình luận, nạp lại danh sách. */
  onReconnected: () => void;
};

type Room = { tenBang: string; idHoSo: number; handlers: Set<TraoDoiRoomHandlers> };

const rooms = new Map<string, Room>();
let connection: HubConnection | null = null;
let starting: Promise<void> | null = null;

const roomKey = (tenBang: string, idHoSo: number) => `${tenBang.toLowerCase()}|${Number(idHoSo)}`;

/** Token như API; sắp hết hạn thì làm mới trước (WebSocket gửi qua ?access_token=). */
const accessTokenFactory = async () => {
  let token = await readAccessToken();
  if (token && shouldRefreshAccessToken(token)) {
    token = (await refreshTokenFlow()).accessToken;
  }
  return token ?? "";
};

const roomOf = (event: { tenBang?: string; iD_HoSo?: number }) =>
  event?.tenBang != null && event?.iD_HoSo != null
    ? rooms.get(roomKey(event.tenBang, event.iD_HoSo))
    : undefined;

const vaoPhong = async (room: Room) => {
  try {
    // false = không được xem phiếu / việc này: không nhận gì, khung vẫn chạy như cũ.
    await connection?.invoke<boolean>("VaoPhong", room.tenBang, room.idHoSo);
  } catch (err) {
    warn("[TraoDoiHub] VaoPhong error", err);
  }
};

const RETRY_AFTER_CLOSE_MS = 10000;

const rejoinAll = () => {
  rooms.forEach((room) => {
    vaoPhong(room);
    room.handlers.forEach((handler) => handler.onReconnected());
  });
};

const getConnection = () => {
  if (connection) return connection;

  const next = new HubConnectionBuilder()
    .withUrl(TRAO_DOI_HUB_URL, { accessTokenFactory })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.None)
    .build();

  next.on("BinhLuanMoi", (event: BinhLuanMoiEvent) => {
    if (!event?.binhLuan) return;
    roomOf(event)?.handlers.forEach((handler) => handler.onBinhLuanMoi(event.binhLuan));
  });
  next.on("DangNhap", (event: DangNhapEvent) => {
    roomOf(event)?.handlers.forEach((handler) => handler.onDangNhap(event));
  });
  // Nối lại = kết nối mới ở server: phải vào lại phòng (mục 1).
  next.onreconnected(rejoinAll);
  // Tự nối lại đã bỏ cuộc (mất mạng lâu) mà khung bình luận còn mở: thử lại sau.
  next.onclose(() => {
    if (connection !== next || !rooms.size) return;
    setTimeout(() => {
      if (connection !== next || !rooms.size) return;
      ensureConnected()
        .then((hub) => hub && rejoinAll())
        .catch(() => undefined);
    }, RETRY_AFTER_CLOSE_MS);
  });

  connection = next;
  return next;
};

const ensureConnected = async () => {
  const hub = getConnection();
  if (hub.state === HubConnectionState.Disconnected && !starting) {
    starting = hub.start().finally(() => {
      starting = null;
    });
  }
  if (starting) await starting;
  return hub.state === HubConnectionState.Connected ? hub : null;
};

const stopIfIdle = () => {
  if (rooms.size || !connection) return;
  const hub = connection;
  connection = null;
  hub.stop().catch(() => undefined);
};

/**
 * Vào phòng của 1 phiếu / 1 công việc. Trả hàm rời phòng (gọi khi thoát khung
 * bình luận). Không kết nối được thì im lặng — app vẫn chạy như không realtime.
 */
export const joinTraoDoiRoom = (
  tenBang: string,
  idHoSo: number,
  handlers: TraoDoiRoomHandlers,
) => {
  const key = roomKey(tenBang, idHoSo);
  let room = rooms.get(key);
  const isNewRoom = !room;
  if (!room) {
    room = { tenBang, idHoSo, handlers: new Set() };
    rooms.set(key, room);
  }
  room.handlers.add(handlers);

  if (isNewRoom) {
    const joined = room;
    ensureConnected()
      .then((hub) => {
        if (hub && rooms.get(key) === joined) vaoPhong(joined);
      })
      .catch((err) => warn("[TraoDoiHub] connect error", err));
  }

  return () => {
    const current = rooms.get(key);
    if (!current) return;
    current.handlers.delete(handlers);
    if (current.handlers.size) return;

    rooms.delete(key);
    if (connection?.state === HubConnectionState.Connected) {
      connection.invoke("RoiPhong", tenBang, idHoSo).catch(() => undefined);
    }
    stopIfIdle();
  };
};

/** Báo "đang nhập" (true) / "thôi nhập" (false) cho người khác trong phòng. */
export const sendDangNhap = (tenBang: string, idHoSo: number, dangNhap: boolean) => {
  if (connection?.state !== HubConnectionState.Connected) return;
  connection.invoke("DangNhap", tenBang, idHoSo, dangNhap).catch(() => undefined);
};
