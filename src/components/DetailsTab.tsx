import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getClassReference } from "@/services/data/callApi";
import IsLoading from "@/components/ui/IconLoading";
import { useRouter } from "expo-router";
import { MenuItemResponse } from "@/types";
import { useParams } from "@/hooks/useParams";

export default function DeTailsTab() {
  const router = useRouter();

  const { id, nameClass } = useParams();

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
            const iconName = item.iconMobile as keyof typeof Ionicons.glyphMap;

            return {
              ...item,
              label: item.moTa ?? "Không có mô tả",
              icon: Ionicons.glyphMap[iconName]
                ? iconName
                : "document-text-outline",
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
    router.push({
      pathname: "/(data)/taisan/related-list",
      params: {
        name: item.name,
        propertyReference: item.propertyReference,
        idRoot: id, // giữ nguyên string
      },
    });
  };

  const renderItem = ({ item }: { item: MenuItemResponse }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={0.7}
      onPress={() => handlePress(item)}
    >
      <Ionicons
        name={item.icon}
        size={24}
        color="#FF3333"
        style={styles.icon}
      />
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <IsLoading />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
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
