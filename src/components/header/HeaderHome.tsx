// src/header/HeaderHome.tsx
import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HeaderHome() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.headerContainer}>
      <Image
        source={require("../../assets/images/logo-cholimex.jpg")}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate("Home")}>
          <Ionicons name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FF3333",
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: { width: 100, height: 40 },
  headerIcons: { flexDirection: "row", alignItems: "center" },
});
