import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

import { AssetCloneItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import EnumAndReferencePickerModal from "../modal/EnumAndReferencePickerModal";
import { getMatchedKey } from "../../utils/Helper";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { fetchEnumByField } from "../../utils/fetchField/FetchEnumField";
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import { useNavigation } from "@react-navigation/native";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { setShouldRefreshList } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { ParseFieldActive } from "../../utils/parser/ParseFieldActive";
import { GroupFields } from "../../utils/parser/GroupFields";
import { ToggleGroupUtil } from "../../utils/parser/ToggleGroup";
import { insert } from "../../services/data/CallApi";
import { fetchReferenceByField } from "../../utils/fetchField/FetchReferenceField";

export default function AssetCloneItem() {
  const { item, field, nameClass } = useParams();
  const navigation = useNavigation<AssetCloneItemNavigationProp>();

  const dispatch = useDispatch<AppDispatch>();

  // Active fields
  const fieldActive = useMemo(() => ParseFieldActive(field), [field]);
  const groupedFields = useMemo(() => GroupFields(fieldActive), [fieldActive]);

  // states
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<
    Record<string, boolean>
  >({});
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<Record<string, any[]>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {}
  );
  const [images, setImages] = useState<Record<string, string>>({});

  // init collapse group
  useEffect(() => {
    const next: Record<string, boolean> = {};
    Object.keys(groupedFields).forEach((k) => (next[k] = false));
    setCollapsedGroups(next);
  }, [groupedFields]);

  // Init formData từ item gốc (nhưng xoá ID)
  useEffect(() => {
    const initial: Record<string, any> = {};

    fieldActive.forEach((f) => {
      const name = f.name;
      const matchedKey = getMatchedKey(item || {}, name);
      const raw = matchedKey ? item?.[matchedKey] : undefined;

      switch (f.typeProperty) {
        case TypeProperty.Date:
          initial[name] = raw ? normalizeDateFromBE(raw) : "";
          break;

        case TypeProperty.Bool:
          initial[name] =
            raw === true || raw === 1 || raw === "1"
              ? true
              : raw === false || raw === 0 || raw === "0"
              ? false
              : !!raw;
          break;

        case TypeProperty.Int:
        case TypeProperty.Decimal:
        case TypeProperty.Enum:
          initial[name] =
            raw !== undefined && raw !== null && raw !== "" ? raw : "";
          break;

        case TypeProperty.Reference: {
          initial[name] = raw ?? "";
          const rawText =
            (matchedKey && item?.[`${matchedKey}_MoTa`]) ??
            item?.[`${name}_MoTa`] ??
            "";
          initial[`${name}_MoTa`] = rawText ?? "";
          break;
        }

        case TypeProperty.Image:
          if (raw && raw !== "---") {
            initial[name] = raw;
            fetchImage(name, raw, setLoadingImages, setImages);
          } else {
            initial[name] = "";
          }
          break;

        default:
          initial[name] = raw != null ? raw : "";
      }
    });

    setFormData(initial);
  }, [fieldActive, item]);

  // fetch Enum & Reference không có cha
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Enum && f.enumName) {
        fetchEnumByField(f.enumName, f.name, setEnumData);
      }
      if (
        f.typeProperty === TypeProperty.Reference &&
        f.referenceName &&
        !f.parentsFields
      ) {
        fetchReferenceByField(f.referenceName, f.name, setReferenceData);
      }
    });
  }, [fieldActive]);

  // fetch Reference có cha (Cascade)
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Reference && f.parentsFields) {
        const parents = f.parentsFields.split(",");
        const haveAll = parents.every((p) => formData[p]);
        if (haveAll) {
          const parentValue = parents.map((p) => formData[p]).join(",");
          fetchReferenceByFieldWithParent(
            f.referenceName!,
            f.name,
            parentValue,
            setReferenceData
          );
        }
      }
    });
  }, [formData]);

  // auto load image
  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  // change & cascade
  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    handleCascadeChange({
      name,
      value,
      fieldActive,
      setFormData,
      setReferenceData,
    });
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ToggleGroupUtil(prev, groupName));
  };

  // CREATE NEW (CLONE)
  const handleClone = async () => {
    if (!Object.keys(formData).length) {
      Alert.alert("Thông báo", "Không có dữ liệu để clone!");
      return;
    }

    if (!nameClass) {
      Alert.alert("Lỗi", "Không xác định được danh mục!");
      return;
    }

    try {
      // copy object
      const payloadData: Record<string, any> = { ...formData };

      // Xoá ID / đặt lại ID = 0
      ["id", "ID", "Id"].forEach(
        (k) => payloadData[k] && delete payloadData[k]
      );
      payloadData["id"] = 0;

      // Chuẩn hoá value trước khi gửi
      fieldActive.forEach((f) => {
        const key = f.name;
        const value = payloadData[key];

        switch (f.typeProperty) {
          // FORMAT DATE
          case TypeProperty.Date:
            payloadData[key] = value ? formatDateForBE(value) : null;
            break;

          // FORMAT NUMBER
          case TypeProperty.Int:
          case TypeProperty.Decimal:
            payloadData[key] =
              value !== "" && value !== null ? Number(value) : null;
            break;

          // FORMAT IMAGE
          case TypeProperty.Image:
            payloadData[key] = value === "" || value === "---" ? null : value;
            break;

          default:
            payloadData[key] = value === "" ? null : value;
        }
      });

      // Xoá tất cả trường _MoTa liên quan reference
      Object.keys(payloadData).forEach(
        (k) => k.endsWith("_MoTa") && delete payloadData[k]
      );

      // Final payload giống Create
      const payload = {
        entities: [payloadData],
        saveHistory: true,
      };

      await insert(nameClass, payload);

      Alert.alert(
        "Thành công",
        "Đã tạo bản sao!",
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({});
              setImages({});

              dispatch(setShouldRefreshList(true));
              navigation.reset({
                index: 2,
                routes: [
                  { name: "Home" },
                  { name: "Asset" },
                  {
                    name: "AssetList",
                    params: { nameClass },
                  },
                ],
              });
            },
          },
        ],
        { cancelable: false }
      );
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tạo bản sao!");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        {Object.entries(groupedFields).map(([gName, fields]) => {
          const collapsed = collapsedGroups[gName];
          return (
            <View key={gName} style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(gName)}
              >
                <Text style={styles.groupTitle}>{gName}</Text>
                <Ionicons
                  name={collapsed ? "chevron-down" : "chevron-up"}
                  size={26}
                  color={"#FF3333"}
                />
              </TouchableOpacity>

              {!collapsed &&
                fields.map((f) => {
                  if (f.isReadOnly) return null; // ẨN TOÀN BỘ FIELD

                  return (
                    <View key={f.id ?? f.name} style={styles.fieldBlock}>
                      <Text style={styles.label}>{f.moTa ?? f.name}</Text>
                      <RenderInputByType
                        f={f}
                        formData={formData}
                        enumData={enumData}
                        referenceData={referenceData}
                        images={images}
                        loadingImages={loadingImages}
                        pickImage={pickImage}
                        setImages={setImages}
                        setLoadingImages={setLoadingImages}
                        handleChange={handleChange}
                        mode="clone"
                        styles={styles}
                        setModalVisible={setModalVisible}
                        setActiveEnumField={setActiveEnumField}
                        getDefaultValueForField={getDefaultValueForField}
                      />
                    </View>
                  );
                })}
            </View>
          );
        })}

        {/* Button Clone */}
        <TouchableOpacity
          style={styles.createCloneButton}
          onPress={handleClone}
        >
          <Text style={styles.createCloneButtonText}>Tạo bản sao</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Select modal */}
      <EnumAndReferencePickerModal
        visible={modalVisible}
        title={`${activeEnumField?.moTa ?? ""}`}
        items={
          activeEnumField
            ? [
                {
                  value: "",
                  text: `${activeEnumField.moTa ?? activeEnumField.name}`,
                },
                ...(activeEnumField.typeProperty === TypeProperty.Reference
                  ? referenceData[activeEnumField.name] || []
                  : enumData[activeEnumField.name] || []),
              ]
            : []
        }
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          if (activeEnumField) {
            handleChange(
              activeEnumField.name,
              value === "" ? "" : isNaN(value) ? value : Number(value)
            );
          }
          setModalVisible(false);
        }}
      />
    </KeyboardAvoidingView>
  );
}

// UI
const styles = StyleSheet.create({
  groupCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },

  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  groupTitle: { fontSize: 16, fontWeight: "700", color: "#FF3333" },
  fieldBlock: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  createCloneButton: {
    backgroundColor: "#FF3333",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  createCloneButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    minHeight: 100,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },

  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FF3333",
    borderRadius: 8,
    backgroundColor: "#fff",
    marginTop: 6,
  },

  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },

  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 4,
    borderRadius: 20,
  },
});
