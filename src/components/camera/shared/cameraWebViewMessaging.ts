type CameraWebViewLike = {
  postMessage?: (message: string) => void;
} | null | undefined;

export const postCameraWebViewMessage = (
  ref: CameraWebViewLike,
  message: string,
) => {
  ref?.postMessage?.(message);
};

export const postCameraWebViewToken = (
  ref: CameraWebViewLike,
  token: string,
) => {
  if (!token) return;

  postCameraWebViewMessage(
    ref,
    JSON.stringify({ type: "token", value: token }),
  );
};

export const startCameraWebView = (ref: CameraWebViewLike) => {
  postCameraWebViewMessage(ref, "start");
};

export const stopCameraWebView = (ref: CameraWebViewLike) => {
  postCameraWebViewMessage(ref, "stop");
};

export const setCameraWebViewTokenAndStart = (
  ref: CameraWebViewLike,
  token: string,
) => {
  postCameraWebViewToken(ref, token);
  startCameraWebView(ref);
};

export const broadcastCameraWebViewMessage = (
  refs: Record<string, CameraWebViewLike>,
  message: string,
) => {
  Object.values(refs).forEach((ref) => postCameraWebViewMessage(ref, message));
};

export const broadcastCameraWebViewToken = (
  refs: Record<string, CameraWebViewLike>,
  token: string,
) => {
  Object.values(refs).forEach((ref) => postCameraWebViewToken(ref, token));
};
