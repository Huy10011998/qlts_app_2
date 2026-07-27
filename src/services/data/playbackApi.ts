import { BASE_URL } from "../../config";

const PLAYBACK_URL = `${BASE_URL}/Playback`;
const API_ORIGIN = BASE_URL.replace(/\/api\/?$/i, "");

export type PlaybackRecording = {
  endMs: number;
  startMs: number;
};

export type PlaybackSession = {
  hlsUrl: string;
  sessionId: string;
};

const playbackHeaders = (cameraToken: string) => ({
  Authorization: `Bearer ${cameraToken}`,
  "Content-Type": "application/json",
});

const readError = async (response: Response) => {
  const message = await response.text();
  throw new Error(message || "Lỗi hệ thống. Vui lòng thử lại.");
};

export const toDvrIso = (timestampMs: number) => {
  const date = new Date(timestampMs);
  const pad = (value: number) => String(value).padStart(2, "0");

  // Đầu ghi hiểu các thành phần là giờ local; Z ở đây là literal theo API
  // playback hiện tại, không chuyển Date sang UTC bằng toISOString().
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
      date.getSeconds()
    )}.000Z`
  );
};

export const getPlaybackDayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const tomorrow = new Date(start);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const now = new Date();
  const isToday =
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate();

  return {
    dayStartMs: start.getTime(),
    dayEndMs: isToday ? now.getTime() : tomorrow.getTime(),
  };
};

export const getPlaybackRecordings = async (
  cameraMa: string,
  cameraToken: string,
  dayStartMs: number,
  dayEndMs: number
): Promise<PlaybackRecording[]> => {
  const response = await fetch(`${PLAYBACK_URL}/recordings`, {
    method: "POST",
    headers: playbackHeaders(cameraToken),
    body: JSON.stringify({
      cameraMa,
      startTimeUtc: toDvrIso(dayStartMs),
      endTimeUtc: toDvrIso(dayEndMs),
    }),
  });

  if (!response.ok) return readError(response);

  const data = await response.json();
  return Array.isArray(data)
    ? data
        .map((item) => ({
          startMs: Number(item?.startMs ?? item?.StartMs),
          endMs: Number(item?.endMs ?? item?.EndMs),
        }))
        .filter(
          (item) =>
            Number.isFinite(item.startMs) &&
            Number.isFinite(item.endMs) &&
            item.endMs > item.startMs
        )
    : [];
};

export const getPlaybackRecordingDays = async (
  cameraMa: string,
  cameraToken: string,
  year: number,
  month: number
): Promise<number[]> => {
  const response = await fetch(`${PLAYBACK_URL}/recordingDays`, {
    method: "POST",
    headers: playbackHeaders(cameraToken),
    body: JSON.stringify({ cameraMa, year, month }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  return Array.isArray(data)
    ? data.map(Number).filter((day) => day >= 1 && day <= 31)
    : [];
};

export const startPlaybackSession = async (
  cameraMa: string,
  cameraToken: string,
  fromMs: number,
  dayEndMs: number
): Promise<PlaybackSession> => {
  const response = await fetch(`${PLAYBACK_URL}/start`, {
    method: "POST",
    headers: playbackHeaders(cameraToken),
    body: JSON.stringify({
      cameraMa,
      startTimeUtc: toDvrIso(fromMs),
      endTimeUtc: toDvrIso(dayEndMs),
    }),
  });

  if (!response.ok) return readError(response);

  const data = await response.json();
  if (!data?.sessionId || !data?.hlsUrl) {
    throw new Error("Dữ liệu phiên phát lại không hợp lệ.");
  }

  return {
    sessionId: String(data.sessionId),
    hlsUrl: String(data.hlsUrl),
  };
};

export const stopPlaybackSession = async (sessionId: string) => {
  try {
    await fetch(`${PLAYBACK_URL}/${encodeURIComponent(sessionId)}/stop`, {
      method: "POST",
    });
  } catch {
    // Dọn phiên là best-effort; WebSocket đóng cũng báo server ngừng luồng.
  }
};

export const resolvePlaybackHlsUrl = (hlsUrl: string) =>
  /^https?:\/\//i.test(hlsUrl)
    ? hlsUrl
    : `${API_ORIGIN}${hlsUrl.startsWith("/") ? "" : "/"}${hlsUrl}`;

export const getPlaybackWebSocketUrl = (sessionId: string) =>
  `${API_ORIGIN.replace(/^http/i, "ws")}/api/Playback/${encodeURIComponent(
    sessionId
  )}/ws`;
