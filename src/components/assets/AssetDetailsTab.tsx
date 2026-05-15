import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MenuItemResponse, StackNavigation, StackRoute } from "../../types";
import { getClassReference } from "../../services/Index";
import Ionicons from "react-native-vector-icons/Ionicons";
import IsLoading from "../ui/IconLoading";
import EmptyState from "../ui/EmptyState";
import { error } from "../../utils/Logger";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { BG, BRAND_RED } from "./shared/listTheme";

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
  }, [id, isMounted, nameClass, showAlertIfActive]);

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

  const isEmpty = items.length === 0;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          isEmpty && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <EmptyState
            iconName="albums-outline"
            title="Không có dữ liệu liên quan"
            subtitle="Danh mục liên kết sẽ hiển thị tại đây khi có dữ liệu"
          />
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
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 96,
  },
  listContentEmpty: {
    flexGrow: 1,
    paddingTop: 0,
    paddingBottom: 0,
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
});
