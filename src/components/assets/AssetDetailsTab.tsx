import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  DeTailsTabNavigationProp,
  DeTailsTabRouteProp,
  MenuItemResponse,
} from "../../types";
import { getClassReference } from "../../services/Index";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../ui/IconLoading";

export default function AssetDeTailsTab() {
  const navigation = useNavigation<DeTailsTabNavigationProp>();
  const route = useRoute<DeTailsTabRouteProp>();
  const { id, nameClass } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<MenuItemResponse[]>([]);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        if (!id || !nameClass) throw new Error("Thiếu ID hoặc nameClass");

        const response = await getClassReference(nameClass);
        const data = response?.data;

        if (!Array.isArray(data)) {
          throw new Error("Dữ liệu trả về không hợp lệ");
        }

        setItems(
          data.map((item: any): MenuItemResponse => {
            const iconName = item.iconMobile as string;

            return {
              ...item,
              label: item.moTa ?? "Không có mô tả",
              icon: iconName ? iconName : "document-text-outline",
            };
          })
        );
      } catch (error) {
        console.error(error);
        Alert.alert("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [nameClass, id]);

  const handlePress = (item: MenuItemResponse) => {
    navigation.navigate("AssetRelatedList", {
      nameClass: item.name,
      propertyReference: item.propertyReference,
      idRoot: id,
      titleHeader: item.moTa ?? "Danh sách",
    });
  };

  const renderItem = ({ item }: { item: MenuItemResponse }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => handlePress(item)}
    >
      <Ionicons
        name={item.icon as any}
        size={26}
        color="#FF3333"
        style={styles.icon}
      />
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <IsLoading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 70 }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text>Không có dữ liệu</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: "#000",
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginLeft: 56,
  },
});
