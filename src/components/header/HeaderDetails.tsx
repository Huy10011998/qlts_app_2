import React from "react";
import { TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { HeaderOptionsProps } from "../../types";

export const HeaderDetails = ({
  showBackButton,
  showSearchButton,
  onSearchPress,
}: HeaderOptionsProps = {}): NativeStackNavigationOptions => {
  return {
    headerStyle: { backgroundColor: "#FF3333" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
    headerLeft: showBackButton ? () => <HeaderBackButton /> : undefined,
    headerRight: showSearchButton
      ? () => (
          <TouchableOpacity
            onPress={onSearchPress}
            style={{ paddingHorizontal: 10 }}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
        )
      : undefined,
  };
};

/**
 * Nút back sử dụng navigation.goBack()
 */
function HeaderBackButton() {
  const navigation = useNavigation<NavigationProp<any>>();

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingHorizontal: 10 }}
    >
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
}
