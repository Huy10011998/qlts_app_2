type RefetchSource = "network" | "foreground";

type Listener = (source: RefetchSource) => void;

let listeners: Listener[] = [];

export const subscribeAppRefetch = (cb: Listener) => {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
};

export const emitAppRefetch = (source: RefetchSource) => {
  listeners.forEach((cb) => cb(source));
};
