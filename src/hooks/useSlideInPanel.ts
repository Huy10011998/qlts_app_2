import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

type UseSlideInPanelOptions = {
  duration?: number;
  initialOffset: number;
  onBeforeOpen?: () => void | Promise<void>;
};

export function useSlideInPanel({
  duration = 300,
  initialOffset,
  onBeforeOpen,
}: UseSlideInPanelOptions) {
  const [visible, setVisible] = useState(false);
  const translateAnim = useRef(new Animated.Value(initialOffset)).current;
  const isAnimatingRef = useRef(false);

  const openPanel = useCallback(async () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    setVisible(true);
    await onBeforeOpen?.();

    Animated.timing(translateAnim, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
    });
  }, [duration, onBeforeOpen, translateAnim]);

  const closePanel = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    Animated.timing(translateAnim, {
      toValue: initialOffset,
      duration,
      useNativeDriver: true,
    }).start(() => {
      isAnimatingRef.current = false;
      setVisible(false);
    });
  }, [duration, initialOffset, translateAnim]);

  const togglePanel = useCallback(() => {
    if (visible) {
      closePanel();
      return;
    }

    void openPanel();
  }, [closePanel, openPanel, visible]);

  return {
    closePanel,
    openPanel,
    togglePanel,
    translateAnim,
    visible,
  };
}
