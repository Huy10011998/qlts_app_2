import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import IsLoading from "../../ui/IconLoading";

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
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={style}
    >
      <ScrollView contentContainerStyle={contentContainerStyle}>
        {children}
      </ScrollView>

      {modal}
      {refLoadingMore && <IsLoading size="large" color={brandColor} />}

      {isSubmitting && (
        <View style={loadingOverlayStyle}>
          <IsLoading size="large" color={brandColor} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
