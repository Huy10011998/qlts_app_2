import React from "react";
import { TouchableOpacity } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { HeaderOptionsProps } from "../../types";

export const HeaderDetails = ({
  showBackButton,
}: HeaderOptionsProps = {}): NativeStackNavigationOptions => {
  return {
    headerStyle: { backgroundColor: "#FF3333" },
    headerTintColor: "#fff",
    headerTitleAlign: "center",
    headerTitleStyle: { fontWeight: "bold" },
    headerLeft: showBackButton ? () => <HeaderBackButton /> : undefined,
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
