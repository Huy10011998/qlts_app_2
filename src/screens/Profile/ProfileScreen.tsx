import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, ScrollView, Alert } from "react-native";
import IsLoading from "../../components/ui/IconLoading";
import { API_ENDPOINTS } from "../../config/Index";
import { User } from "../../types/Index";
import { callApi } from "../../services/data/CallApi";
import { error } from "../../utils/Logger";
import { useAutoReload } from "../../hooks/useAutoReload";

const ProfileScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const fetchUserInfo = async () => {
    setIsLoading(true);
    try {
      const response = await callApi<{ success: boolean; data: User }>(
        "POST",
        API_ENDPOINTS.GET_INFO,
        {}
      );
      setUser(response.data);
    } catch (e) {
      error("API error:", e);
      Alert.alert("Lỗi", "Không thể tải hồ sơ cá nhân.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // AUTO RELOAD
  useAutoReload(fetchUserInfo);

  const renderRow = (label: string, value?: string) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "---"}</Text>
    </View>
  );

  if (isLoading || !user) {
    return <IsLoading size="large" color="#FF3333" />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <Text style={styles.avatarText}>{user.moTa?.charAt(0) ?? "?"}</Text>
          )}
        </View>
      </View>

      <View style={styles.infoSection}>
        {renderRow("Họ và tên:", user.moTa)}
        {renderRow("Email:", user.email)}
        {renderRow("Đơn vị:", user.donVi)}
        {renderRow("Phòng ban:", user.phongBan)}
        {renderRow("Bộ phận:", user.boPhan)}
        {renderRow("Tổ nhóm:", user.toNhom)}
        {renderRow("Chức vụ:", user.chucVu)}
        {renderRow("Chức danh:", user.chucDanh)}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  header: {
    alignItems: "center",
    paddingVertical: 32,
  },

  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: "#FF3333",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
    resizeMode: "cover",
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
  },

  infoSection: {
    padding: 16,
  },

  row: {
    flexDirection: "row",
    marginBottom: 12,
  },

  label: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
  },

  value: {
    flex: 2,
    fontSize: 14,
    color: "#333",
  },
});

export default ProfileScreen;
