import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigation } from "../../types/Navigator.d";

export default function HeaderHome() {
  const navigation = useNavigation<StackNavigation<"Tabs">>();

  const insets = useSafeAreaInsets(); // lấy safe area

  const handleOpenWebsite = () => {
    Linking.openURL("https://cholimexfood.com.vn");
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={handleOpenWebsite}>
        <Image
          source={require("../../assets/images/logo-cholimex-trans.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>

      <View style={styles.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate("Tabs")}>
          <Ionicons name="home-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FF3333",
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logo: { width: 100, height: 40 },

  headerIcons: { flexDirection: "row", alignItems: "center" },
});
