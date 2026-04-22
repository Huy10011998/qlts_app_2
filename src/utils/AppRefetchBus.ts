type RefetchSource = "network" | "foreground";

type Listener = (source: RefetchSource) => void;

let listeners: Listener[] = [];

export const subscribeAppRefetch = (cb: Listener) => {
  listeners.push(cb);
  // Trả về cleanup function — bắt buộc gọi trong useEffect return
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

export const emitAppRefetch = (source: RefetchSource) => {
  // FIX: slice() tránh mutation trong lúc iterate
  // an toàn nếu listener tự unsubscribe trong callback
  listeners.slice().forEach((cb) => cb(source));
};
