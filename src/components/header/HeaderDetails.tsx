import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, { Path } from "react-native-svg";
import type { HeaderOptionsProps } from "../../types";
import { C } from "../../utils/helpers/colors";

const styles = StyleSheet.create({
  outer: {
    backgroundColor: C.red,
    overflow: "hidden",
  },
  decoLarge: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "rgba(255,255,255,0.09)",
    top: -44,
    right: -34,
  },
  decoMid: {
    position: "absolute",
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: 18,
    right: 54,
  },
  decoSoft: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(0,0,0,0.06)",
    bottom: 18,
    left: -20,
  },
  decoBubbleOne: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    top: 18,
    left: 72,
  },
  decoBubbleTwo: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    top: 52,
    left: 112,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 56,
  },
  sideSlot: {
    minWidth: 32,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  titleBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  titleBadgeIcon: {
    marginRight: 4,
  },
  titleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  title: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 18,
    textAlign: "center",
  },
  iconButton: {
    paddingHorizontal: 5,
  },
  qrButtonWrap: {
    position: "relative",
  },
  qrButtonDot: {
    position: "absolute",
    top: 1,
    right: 3,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#FFD60A",
    borderWidth: 1,
    borderColor: C.red,
  },
  waveContainer: {
    height: 20,
  },
  headerWave: {
    position: "absolute",
    bottom: 0,
  },
});

export const HeaderDetails = ({
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
}: HeaderOptionsProps = {}): NativeStackNavigationOptions => {
  return {
    headerShown: true,
    header: (props) => (
      <HeaderDetailsBar
        {...props}
        showBackButton={showBackButton}
        showQrScannerButton={showQrScannerButton}
        onQrScannerPress={onQrScannerPress}
      />
    ),
  };
};

export function HeaderDetailsModalHeader({
  title,
  onBack,
  backIcon = "arrow-back",
  badgeLabel,
  iconName,
  rightSlot,
}: {
  title: string;
  onBack?: () => void;
  backIcon?: React.ComponentProps<typeof Ionicons>["name"];
  badgeLabel?: string;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  rightSlot?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const meta = getHeaderMeta(title);
  const resolvedBadgeLabel = badgeLabel ?? meta.badgeLabel;
  const resolvedIconName = iconName ?? meta.iconName;

  return (
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      <View style={styles.decoLarge} />
      <View style={styles.decoMid} />
      <View style={styles.decoSoft} />
      <View style={styles.decoBubbleOne} />
      <View style={styles.decoBubbleTwo} />

      <View style={styles.topBar}>
        <View style={styles.sideSlot}>
          {onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.iconButton}>
              <Ionicons name={backIcon} size={26} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.titleWrap}>
          <View style={styles.titleBadge}>
            <Ionicons
              name={resolvedIconName}
              size={12}
              color="rgba(255,255,255,0.82)"
              style={styles.titleBadgeIcon}
            />
            <Text style={styles.titleBadgeText} allowFontScaling={false}>
              {resolvedBadgeLabel}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            allowFontScaling={false}
            minimumFontScale={0.7}
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
        </View>

        <View style={[styles.sideSlot, styles.rightSlot]}>{rightSlot}</View>
      </View>

      <View style={styles.waveContainer}>
        <HeaderWave />
      </View>
    </View>
  );
}

function HeaderDetailsBar({
  navigation,
  options,
  route,
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
}: NativeStackHeaderProps & HeaderOptionsProps) {
  const insets = useSafeAreaInsets();
  const title =
    typeof options.title === "string" && options.title.trim()
      ? options.title
      : route.name;
  const meta = getHeaderMeta(title);
  const customHeaderRight =
    typeof options.headerRight === "function"
      ? options.headerRight({
          tintColor: "#fff",
          canGoBack: navigation.canGoBack(),
        })
      : null;

  const handleQrPress = () => {
    if (onQrScannerPress) {
      onQrScannerPress();
      return;
    }

    (navigation as any).navigate("ScanTab", {
      screen: "Scan",
      initial: false,
    });
  };

  return (
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      <View style={styles.decoLarge} />
      <View style={styles.decoMid} />
      <View style={styles.decoSoft} />
      <View style={styles.decoBubbleOne} />
      <View style={styles.decoBubbleTwo} />

      <View style={styles.topBar}>
        <View style={styles.sideSlot}>
          {showBackButton ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
            >
              <Ionicons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.titleWrap}>
          <View style={styles.titleBadge}>
            <Ionicons
              name={meta.iconName}
              size={12}
              color="rgba(255,255,255,0.82)"
              style={styles.titleBadgeIcon}
            />
            <Text style={styles.titleBadgeText} allowFontScaling={false}>
              {meta.badgeLabel}
            </Text>
          </View>
          <Text
            adjustsFontSizeToFit
            allowFontScaling={false}
            minimumFontScale={0.7}
            numberOfLines={1}
            style={styles.title}
          >
            {title}
          </Text>
        </View>

        <View style={[styles.sideSlot, styles.rightSlot]}>
          <View style={styles.rightActions}>
            {customHeaderRight}
            {showQrScannerButton ? (
              <View style={styles.qrButtonWrap}>
                <TouchableOpacity
                  onPress={handleQrPress}
                  style={styles.iconButton}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={24}
                    color="#fff"
                  />
                </TouchableOpacity>
                <View style={styles.qrButtonDot} />
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.waveContainer}>
        <HeaderWave />
      </View>
    </View>
  );
}

const HeaderWave: React.FC = () => {
  const { width } = useWindowDimensions();

  return (
    <Svg
      width={width}
      height={20}
      viewBox={`0 0 ${width} 20`}
      style={styles.headerWave}
    >
      <Path
        d={`M0,6 C${width * 0.22},20 ${width * 0.44},0 ${width * 0.66},12 C${
          width * 0.82
        },20 ${width * 0.92},6 ${width},12 L${width},20 L0,20 Z`}
        fill="rgba(255,255,255,0.14)"
      />
      <Path
        d={`M0,10 C${width * 0.28},20 ${width * 0.52},4 ${width * 0.78},14 C${
          width * 0.9
        },18 ${width},8 ${width},20 L${width},20 L0,20 Z`}
        fill="#F0F2F8"
      />
    </Svg>
  );
};

function getHeaderMeta(title: string) {
  const normalizedTitle = title.trim().toLowerCase();

  if (normalizedTitle.includes("camera")) {
    return {
      badgeLabel: "Camera",
      iconName: "videocam-outline" as const,
    };
  }

  if (normalizedTitle.includes("đại hội")) {
    return {
      badgeLabel: "Bieu quyet",
      iconName: "people-outline" as const,
    };
  }

  if (normalizedTitle.includes("chỉnh sửa")) {
    return {
      badgeLabel: "Cap nhat",
      iconName: "create-outline" as const,
    };
  }

  if (
    normalizedTitle.includes("thêm") ||
    normalizedTitle.includes("moi") ||
    normalizedTitle.includes("bản sao")
  ) {
    return {
      badgeLabel: "Tao moi",
      iconName: "add-circle-outline" as const,
    };
  }

  if (
    normalizedTitle.includes("danh sách") ||
    normalizedTitle.includes("tài sản")
  ) {
    return {
      badgeLabel: "Danh sach",
      iconName: "list-outline" as const,
    };
  }

  if (normalizedTitle.includes("chi tiết")) {
    return {
      badgeLabel: "Chi tiet",
      iconName: "document-text-outline" as const,
    };
  }

  return {
    badgeLabel: "Thong tin",
    iconName: "sparkles-outline" as const,
  };
}
