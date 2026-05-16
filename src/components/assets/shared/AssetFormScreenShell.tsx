import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import {
  findNodeHandle,
  Platform,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import IsLoading from "../../ui/IconLoading";

type AssetFormKeyboardContextValue = {
  handleInputFocus: (target: any) => void;
};

const AssetFormKeyboardContext =
  createContext<AssetFormKeyboardContextValue | null>(null);

export const useAssetFormKeyboard = () =>
  useContext(AssetFormKeyboardContext);

type AssetFormScreenShellProps = {
  brandColor: string;
  children: React.ReactNode;
  contentContainerStyle: StyleProp<ViewStyle>;
  modal?: React.ReactNode;
  refLoadingMore?: boolean;
  isSubmitting?: boolean;
  loadingOverlayStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
};

export default function AssetFormScreenShell({
  brandColor,
  children,
  contentContainerStyle,
  modal,
  refLoadingMore = false,
  isSubmitting = false,
  loadingOverlayStyle,
  style,
}: AssetFormScreenShellProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<KeyboardAwareScrollView | null>(null);

  const handleInputFocus = useCallback((target: any) => {
    if (!target) return;

    setTimeout(() => {
      const scrollView = scrollRef.current as any;
      if (!scrollView) return;

      if (typeof scrollView.scrollIntoView === "function") {
        scrollView.scrollIntoView(target, {
          getScrollPosition: (
            parentLayout: { x: number; y: number },
            childLayout: { x: number; y: number },
            contentOffset: { x: number; y: number },
          ) => ({
            x: 0,
            y: Math.max(0, childLayout.y - parentLayout.y + contentOffset.y - 24),
            animated: true,
          }),
        });
        return;
      }

      const nodeHandle =
        typeof target === "number" ? target : findNodeHandle(target);
      if (!nodeHandle) return;

      scrollView.scrollToFocusedInput?.(nodeHandle, 120, 0);
    }, Platform.OS === "ios" ? 60 : 120);
  }, []);

  const keyboardContextValue = useMemo(
    () => ({ handleInputFocus }),
    [handleInputFocus],
  );

  return (
    <AssetFormKeyboardContext.Provider value={keyboardContextValue}>
      <View style={style}>
        <KeyboardAwareScrollView
          innerRef={(instance) => {
            scrollRef.current = instance;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={[
            contentContainerStyle,
            {
              paddingBottom: Math.max(insets.bottom, 16) + 132,
            },
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableOnAndroid
          extraHeight={Platform.OS === "ios" ? 120 : 140}
          extraScrollHeight={Platform.OS === "ios" ? 96 : 120}
          keyboardOpeningTime={0}
          enableResetScrollToCoords={false}
        >
          {children}
        </KeyboardAwareScrollView>

        {modal}
        {refLoadingMore && <IsLoading size="large" color={brandColor} />}

        {isSubmitting && (
          <View style={loadingOverlayStyle}>
            <IsLoading size="large" color={brandColor} />
          </View>
        )}
      </View>
    </AssetFormKeyboardContext.Provider>
  );
}
