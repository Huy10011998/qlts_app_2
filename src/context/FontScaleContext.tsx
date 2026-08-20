import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  clampTextScaleStep,
  getTextScaleFactorForStep,
  setTextScaleFactor,
  TEXT_SCALE_DEFAULT_STEP,
} from "../utils/helpers/textScaling";

type FontScaleContextValue = {
  /** Nấc đang chọn trên thanh trượt, 0…6. */
  step: number;
  /** Hệ số nhân cỡ chữ tương ứng với `step`. */
  factor: number;
  setStep: (step: number) => void;
};

const TEXT_SCALE_STEP_KEY = "@qlts/text-scale-step";

const FontScaleContext = createContext<FontScaleContextValue | undefined>(
  undefined
);

const parseStoredStep = (value: string | null) => {
  if (value == null) return TEXT_SCALE_DEFAULT_STEP;

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? clampTextScaleStep(parsed)
    : TEXT_SCALE_DEFAULT_STEP;
};

export function FontScaleProvider({ children }: React.PropsWithChildren) {
  const [step, setStepState] = useState(TEXT_SCALE_DEFAULT_STEP);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isActive = true;

    AsyncStorage.getItem(TEXT_SCALE_STEP_KEY)
      .then((storedStep) => {
        if (!isActive) return;

        const initialStep = parseStoredStep(storedStep);

        // Đặt hệ số trước khi mount màn hình đầu tiên, để frame đầu đã đúng cỡ
        // chữ người dùng chọn thay vì nháy qua cỡ mặc định.
        setTextScaleFactor(getTextScaleFactorForStep(initialStep));
        setStepState(initialStep);
        setIsHydrated(true);
      })
      .catch(() => {
        if (!isActive) return;

        // Giữ mặc định an toàn, nhưng vẫn mở cổng bootstrap khi không đọc được
        // storage.
        setTextScaleFactor(getTextScaleFactorForStep(TEXT_SCALE_DEFAULT_STEP));
        setIsHydrated(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const setStep = useCallback((nextStep: number) => {
    const clamped = clampTextScaleStep(nextStep);

    setTextScaleFactor(getTextScaleFactorForStep(clamped));
    setStepState(clamped);
    AsyncStorage.setItem(TEXT_SCALE_STEP_KEY, String(clamped)).catch(() => {
      // Cỡ chữ vừa chọn vẫn có hiệu lực trong phiên này dù lưu thất bại.
    });
  }, []);

  const value = useMemo<FontScaleContextValue>(
    () => ({ step, factor: getTextScaleFactorForStep(step), setStep }),
    [step, setStep]
  );

  if (!isHydrated) return null;

  return (
    <FontScaleContext.Provider value={value}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useTextScale() {
  const context = useContext(FontScaleContext);

  if (!context) {
    throw new Error("useTextScale must be used inside FontScaleProvider");
  }

  return context;
}
