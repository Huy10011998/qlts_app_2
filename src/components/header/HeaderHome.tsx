import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { TabsScreenNavigationProp } from "../../types";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function HeaderHome() {
  const navigation = useNavigation<TabsScreenNavigationProp>();

  // Hàm mở website
  const handleOpenWebsite = () => {
    Linking.openURL("https://cholimexfood.com.vn");
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={handleOpenWebsite}>
        <Image
          source={require("../../assets/images/logo-cholimex.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate("Tabs")}>
          <Ionicons name="home-outline" size={26} color="#fff" />
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
