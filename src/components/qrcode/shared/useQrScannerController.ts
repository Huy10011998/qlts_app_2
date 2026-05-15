import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Platform } from "react-native";
import { request, PERMISSIONS, RESULTS } from "react-native-permissions";
import { useCameraDevice, useCameraFormat } from "react-native-vision-camera";

const CAMERA_FORMAT_PREFERENCES = [
  { videoResolution: { width: 1280, height: 720 } },
  { fps: 30 },
];

const CAMERA_INIT_TIMEOUT_MS = 5000;

type UseQrScannerControllerOptions = {
  enabled: boolean;
};

export default function useQrScannerController({
  enabled,
}: UseQrScannerControllerOptions) {
  const [appState, setAppState] = useState(AppState.currentState);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [screenActive, setScreenActive] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  const scannedRef = useRef(false);
  const initTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const device = useCameraDevice("back");
  const format =
    useCameraFormat(device, CAMERA_FORMAT_PREFERENCES) ?? device?.formats[0];

  const cameraActive = enabled && screenActive && appState === "active";

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);

    return () => subscription.remove();
  }, []);

  const startScanLine = useCallback(() => {
    scanLineAnim.setValue(0);
    scanLoopRef.current = Animated.loop(
      Animated.timing(scanLineAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    );
    scanLoopRef.current.start();
  }, [scanLineAnim]);

  const stopScanLine = useCallback(() => {
    scanLoopRef.current?.stop();
  }, []);

  const clearInitTimeoutTimer = useCallback(() => {
    if (initTimerRef.current) {
      clearTimeout(initTimerRef.current);
      initTimerRef.current = null;
    }
  }, []);

  const startInitTimeoutTimer = useCallback(() => {
    clearInitTimeoutTimer();
    setInitTimeout(false);
    initTimerRef.current = setTimeout(() => {
      setInitTimeout(true);
    }, CAMERA_INIT_TIMEOUT_MS);
  }, [clearInitTimeoutTimer]);

  const checkPermission = useCallback(async () => {
    const result =
      Platform.OS === "ios"
        ? await request(PERMISSIONS.IOS.CAMERA)
        : await request(PERMISSIONS.ANDROID.CAMERA);

    setHasPermission(result === RESULTS.GRANTED);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    checkPermission();
  }, [checkPermission, enabled]);

  useEffect(() => {
    if (!enabled || appState !== "active" || hasPermission === true) return;
    checkPermission();
  }, [appState, checkPermission, enabled, hasPermission]);

  useEffect(() => {
    return () => {
      clearInitTimeoutTimer();
      stopScanLine();
    };
  }, [clearInitTimeoutTimer, stopScanLine]);

  const resetScannerSession = useCallback(() => {
    scannedRef.current = false;
    setInitTimeout(false);
    setIsTorchOn(false);
  }, []);

  const activateScanner = useCallback(() => {
    setScreenActive(true);
    startScanLine();
  }, [startScanLine]);

  const deactivateScanner = useCallback(() => {
    setScreenActive(false);
    stopScanLine();
  }, [stopScanLine]);

  const pauseScanner = useCallback(() => {
    scannedRef.current = true;
    deactivateScanner();
  }, [deactivateScanner]);

  const resumeScanner = useCallback(() => {
    scannedRef.current = false;
    activateScanner();
  }, [activateScanner]);

  return {
    activateScanner,
    cameraActive,
    checkPermission,
    clearInitTimeoutTimer,
    deactivateScanner,
    device,
    format,
    hasPermission,
    initTimeout,
    isTorchOn,
    pauseScanner,
    resetScannerSession,
    resumeScanner,
    scanLineAnim,
    scannedRef,
    setIsTorchOn,
    startInitTimeoutTimer,
    startScanLine,
    stopScanLine,
  };
}
