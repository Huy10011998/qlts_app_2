import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IsLoading from "../../ui/IconLoading";
import { C, useSeparatorColor } from "../../../utils/helpers/colors";

type AssetFormKeyboardContextValue = {
  handleInputFocus: (target: any) => void;
  dismissKeyboard: () => void;
};

const AssetFormKeyboardContext =
  createContext<AssetFormKeyboardContextValue | null>(null);

const FOCUSED_INPUT_TOP_GAP = 16;
const FOCUSED_INPUT_BOTTOM_GAP = 30;
const DEFAULT_KEYBOARD_BOTTOM_SCROLL_BUFFER = 24;
const KEYBOARD_SCROLL_SETTLE_DELAY = 220;
const KEYBOARD_SCROLL_FIRST_DELAY = 120;
const FOCUSED_INPUT_PREFERRED_VISIBLE_RATIO = 0.4;

export const useAssetFormKeyboard = () =>
  useContext(AssetFormKeyboardContext);

type AssetFormScreenShellProps = {
  brandColor: string;
  children: React.ReactNode;
  contentContainerStyle: StyleProp<ViewStyle>;
  modal?: React.ReactNode;
  footer?: React.ReactNode;
  refLoadingMore?: boolean;
  isSubmitting?: boolean;
  footerStyle?: StyleProp<ViewStyle>;
  keyboardBottomScrollBuffer?: number;
  loadingOverlayStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export default function AssetFormScreenShell({
  brandColor,
  children,
  contentContainerStyle,
  modal,
  footer,
  refLoadingMore = false,
  isSubmitting = false,
  footerStyle,
  keyboardBottomScrollBuffer = DEFAULT_KEYBOARD_BOTTOM_SCROLL_BUFFER,
  loadingOverlayStyle,
  style,
}: AssetFormScreenShellProps) {
  const separatorColor = useSeparatorColor();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState(0);
  const [scrollViewportHeight, setScrollViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const focusedInputRef = useRef<any>(null);
  const scrollYRef = useRef(0);
  const keyboardTopRef = useRef(0);
  const scrollTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const bottomSafeArea = Math.max(insets.bottom, 12);
  const footerSpace = footer ? Math.max(footerHeight, 86) : 0;
  const keyboardSpace =
    keyboardTop > 0
      ? FOCUSED_INPUT_BOTTOM_GAP + keyboardBottomScrollBuffer
      : 0;

  const clearPendingScrolls = useCallback(() => {
    scrollTimeoutsRef.current.forEach(clearTimeout);
    scrollTimeoutsRef.current = [];
  }, []);

  const scrollToFocusedInput = useCallback(
    (target: any) => {
      const scrollView = scrollRef.current as any;
      const currentKeyboardTop = keyboardTopRef.current;
      const currentKeyboardSpace =
        currentKeyboardTop > 0
          ? FOCUSED_INPUT_BOTTOM_GAP + keyboardBottomScrollBuffer
          : 0;

      if (!target?.measure || !scrollView?.measure) {
        return;
      }

      scrollView.measure(
        (
          _scrollX: number,
          _scrollY: number,
          _scrollWidth: number,
          scrollHeight: number,
          _scrollPageX: number,
          scrollPageY: number,
        ) => {
          target.measure(
            (
              _x: number,
              _y: number,
              _width: number,
              height: number,
              _pageX: number,
              pageY: number,
            ) => {
              const currentScrollY = scrollYRef.current;
              const viewportHeight = scrollViewportHeight || scrollHeight;
              const bottomOffset = footer
                ? footerSpace + 16
                : bottomSafeArea + 16;
              const visibleTop = scrollPageY + FOCUSED_INPUT_TOP_GAP;
              const keyboardVisibleBottom =
                currentKeyboardTop > 0
                  ? currentKeyboardTop - FOCUSED_INPUT_BOTTOM_GAP
                  : Number.POSITIVE_INFINITY;
              const visibleBottom = Math.min(
                scrollPageY + viewportHeight - bottomOffset,
                keyboardVisibleBottom,
              );
              const fieldTop = pageY;
              const fieldBottom = pageY + height;
              let nextScrollY = currentScrollY;

              if (currentKeyboardTop > 0) {
                const visibleHeight = Math.max(visibleBottom - visibleTop, 0);
                const preferredFieldTop =
                  visibleTop +
                  visibleHeight * FOCUSED_INPUT_PREFERRED_VISIBLE_RATIO;
                const preferredScrollY =
                  currentScrollY + fieldTop - preferredFieldTop;
                const minimumScrollYToRevealBottom =
                  currentScrollY + fieldBottom - visibleBottom;

                nextScrollY = Math.max(
                  preferredScrollY,
                  minimumScrollYToRevealBottom,
                );
              } else if (fieldBottom > visibleBottom) {
                nextScrollY = currentScrollY + fieldBottom - visibleBottom;
              } else if (fieldTop < visibleTop) {
                nextScrollY = currentScrollY - (visibleTop - fieldTop);
              }

              const transientKeyboardSpace =
                currentKeyboardTop > 0
                  ? currentKeyboardSpace + keyboardBottomScrollBuffer
                  : 0;
              const maxScrollY = Math.max(
                contentHeight + transientKeyboardSpace - viewportHeight,
                0,
              );
              const clampedScrollY = Math.min(
                Math.max(nextScrollY, 0),
                maxScrollY,
              );

              if (Math.abs(clampedScrollY - currentScrollY) > 1) {
                scrollRef.current?.scrollTo({
                  y: clampedScrollY,
                  animated: true,
                });
              }
            },
          );
        },
      );
    },
    [
      bottomSafeArea,
      contentHeight,
      footer,
      footerSpace,
      keyboardBottomScrollBuffer,
      scrollViewportHeight,
    ],
  );

  const scheduleFocusedInputScroll = useCallback(
    (delays: number[]) => {
      clearPendingScrolls();
      delays.forEach((delay) => {
        const timeout = setTimeout(() => {
          scrollToFocusedInput(focusedInputRef.current);
        }, delay);
        scrollTimeoutsRef.current.push(timeout);
      });
    },
    [clearPendingScrolls, scrollToFocusedInput],
  );

  const handleInputFocus = useCallback(
    (target: any) => {
      focusedInputRef.current = target;
      if (keyboardTopRef.current > 0) {
        scheduleFocusedInputScroll([KEYBOARD_SCROLL_FIRST_DELAY]);
      }
    },
    [scheduleFocusedInputScroll],
  );

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setFooterHeight(event.nativeEvent.layout.height);
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      setKeyboardTop(event.endCoordinates.screenY);
      scheduleFocusedInputScroll([
        Platform.OS === "ios" ? KEYBOARD_SCROLL_FIRST_DELAY : 80,
        KEYBOARD_SCROLL_SETTLE_DELAY,
      ]);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      clearPendingScrolls();
      keyboardTopRef.current = 0;
      setKeyboardTop(0);
      focusedInputRef.current = null;
    });

    return () => {
      clearPendingScrolls();
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [clearPendingScrolls, scheduleFocusedInputScroll]);

  const keyboardContextValue = useMemo(
    () => ({ handleInputFocus, dismissKeyboard }),
    [dismissKeyboard, handleInputFocus],
  );

  return (
    <AssetFormKeyboardContext.Provider value={keyboardContextValue}>
      <KeyboardAvoidingView
        style={[styles.keyboardRoot, style]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            contentContainerStyle,
            {
              paddingBottom: footer
                ? bottomSafeArea + footerSpace + keyboardSpace + 24
                : bottomSafeArea + keyboardSpace + 24,
            },
          ]}
          onContentSizeChange={(_width, height) => setContentHeight(height)}
          onLayout={(event) =>
            setScrollViewportHeight(event.nativeEvent.layout.height)
          }
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>

        {footer ? (
          <View
            style={[
              styles.footer,
              {
                borderTopColor: separatorColor,
                paddingBottom: bottomSafeArea + 10,
              },
              footerStyle,
            ]}
            onLayout={handleFooterLayout}
          >
            {footer}
          </View>
        ) : null}

        {modal}
        {refLoadingMore && <IsLoading size="large" color={brandColor} />}

        {isSubmitting && (
          <View style={loadingOverlayStyle}>
            <IsLoading size="large" color={brandColor} />
          </View>
        )}
      </KeyboardAvoidingView>
    </AssetFormKeyboardContext.Provider>
  );
}

const styles = StyleSheet.create({
  keyboardRoot: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
});
