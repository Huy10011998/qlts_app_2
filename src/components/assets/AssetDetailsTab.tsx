import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MenuItemResponse, StackNavigation, StackRoute } from "../../types";
import { getClassReference } from "../../services/Index";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../ui/IconLoading";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";

export default function AssetDeTailsTab({
  nameClassRoot,
}: {
  nameClassRoot?: string;
}) {
  const navigation = useNavigation<StackNavigation<"AssetDetails">>();
  const route = useRoute<StackRoute<"AssetDetails">>();

  const { id, nameClass } = route.params;
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
          }),
        );
      } catch (e) {
        error(e);
        showAlertIfActive("Lỗi", `Không thể tải chi tiết ${nameClass}`);
      } finally {
        if (isMounted()) {
          setIsLoading(false);
        }
      }
    };

    fetchDetails();
  }, [nameClass, id]);

  const handlePress = (item: MenuItemResponse) => {
    navigation.navigate("AssetRelatedList", {
      nameClass: item.name,
      propertyReference: item.propertyReference,

      idRoot: id,
      nameClassRoot: nameClassRoot,
      titleHeader: item.moTa ?? "Danh sách",
    });
  };

  const renderItem = ({ item }: { item: MenuItemResponse }) => (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon as any} size={18} color={BRAND_RED} />
      </View>
      <Text style={styles.label}>{item.label}</Text>
      <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
    </Pressable>
  );

  if (isLoading) {
    return <IsLoading size="large" color={BRAND_RED} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="albums-outline" size={32} color="#C7C7CC" />
            </View>
            <Text style={styles.emptyTitle}>Không có dữ liệu liên quan</Text>
            <Text style={styles.emptySub}>
              Danh mục liên kết sẽ hiển thị tại đây khi có dữ liệu
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 8,
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  itemPressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 13.5,
    color: "#0F1923",
    fontWeight: "600",
    lineHeight: 18,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#1A2340",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: "#8A95A3",
    textAlign: "center",
    lineHeight: 18,
  },
});
