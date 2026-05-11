import React from "react";
import { TouchableOpacity, Text } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { HeaderOptionsProps } from "../../types";

export const HeaderDetails = ({
  showBackButton,
  showQrScannerButton,
  onQrScannerPress,
}: HeaderOptionsProps = {}): NativeStackNavigationOptions => {
  return {
    headerStyle: { backgroundColor: "#E31E24" },
    headerTintColor: "#fff",
    headerTitleAlign: "center",
    headerTitleStyle: { fontWeight: "bold" },
    headerTitle: ({ children }) => (
      <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
        {children}
      </Text>
    ),
    headerLeft: showBackButton ? () => <HeaderBackButton /> : undefined,
    headerRight: showQrScannerButton
      ? () => <HeaderQrScannerButton onPress={onQrScannerPress} />
      : undefined,
  };
};

function HeaderBackButton() {
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingHorizontal: 5 }}
    >
      <Ionicons name="arrow-back" size={26} color="#fff" />
    </TouchableOpacity>
  );
}

function HeaderQrScannerButton({ onPress }: { onPress?: () => void }) {
  const navigation = useNavigation<NavigationProp<any>>();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    navigation.navigate("ScanTab", {
      screen: "Scan",
      initial: false,
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} style={{ paddingHorizontal: 5 }}>
      <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
    </TouchableOpacity>
  );
}
