import React, { useEffect, useState } from "react";
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

import { AssetEditItemNavigationProp, Field } from "../../types/Index";
import { TypeProperty } from "../../utils/Enum";
import EnumAndReferencePickerModal from "../modal/EnumAndReferencePickerModal";
import { getMatchedKey } from "../../utils/Helper";
import { useParams } from "../../hooks/useParams";
import { fetchImage, pickImage } from "../../utils/Image";
import { fetchReferenceByFieldWithParent } from "../../utils/cascade/FetchReferenceByFieldWithParent";
import { handleCascadeChange } from "../../utils/cascade/Index";
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import { update } from "../../services/data/CallApi";
import { useNavigation } from "@react-navigation/native";
import { setShouldRefreshDetails } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { useAppDispatch } from "../../store/Hooks";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import IsLoading from "../ui/IconLoading";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";
import { useSafeAlert } from "../../hooks/useSafeAlert";

const BRAND_RED = "#E31E24";
const BG = "#F0F2F8";
const CARD_SHADOW = {
  shadowColor: "#1A2340",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};

export default function AssetEditItem() {
  /* ===== PARAMS ===== */
  const { item, field, nameClass } = useParams();
  const navigation = useNavigation<AssetEditItemNavigationProp>();
  const dispatch = useAppDispatch();

  // Form Data State
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [originalItem, setOriginalItem] = useState<Record<string, any>>(
    item ? { ...item } : {},
  );

  // Enum & Reference Data State
  const [enumData, setEnumData] = useState<Record<string, any[]>>({});
  const [referenceData, setReferenceData] = useState<
    Record<string, { items: any[]; totalCount: number }>
  >({});
  const [modalVisible, setModalVisible] = useState(false);
  const [activeEnumField, setActiveEnumField] = useState<Field | null>(null);
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>(
    {},
  );

  /* ===== REFERENCE LOAD MORE ===== */
  const PAGE_SIZE = 20;
  const [refPage, setRefPage] = useState(0);
  const [refKeyword, setRefKeyword] = useState("");
  const [refLoadingMore, setRefLoadingMore] = useState(false);
  const [refHasMore, setRefHasMore] = useState(true);
  const [refSearching, setRefSearching] = useState(false);

  // Image State
  const [images, setImages] = useState<Record<string, string>>({});

  /* ===== GROUP + FIELD ===== */
  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

  // SET FORM DATA WHEN ITEM OR FIELD ACTIVE CHANGED
  useEffect(() => {
    const initial: Record<string, any> = {};

    if (!fieldActive || !fieldActive.length) {
      setFormData(item ? { ...item } : {});
      setOriginalItem(item ? { ...item } : {});
      return;
    }

    fieldActive.forEach((f) => {
      const name = f.name;
      const matchedKey = getMatchedKey(item || {}, name);
      const raw = matchedKey ? item?.[matchedKey] : undefined;

      // map based on property type
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
          initial[name] = raw != null && raw !== "" ? raw : "";
          break;
        case TypeProperty.Enum:
          initial[name] = raw != null ? raw : "";
          break;
        case TypeProperty.Reference: {
          const rawText =
            (matchedKey && item?.[`${matchedKey}_MoTa`]) ??
            item?.[`${name}_MoTa`] ??
            item?.[`${f.name}_MoTa`] ??
            "";

          // set ID
          initial[name] = raw ?? "";

          // set MoTa (bắt buộc)
          initial[`${name}_MoTa`] = rawText ?? "";

          break;
        }

        case TypeProperty.Image:
          if (raw && raw !== "---") {
            initial[name] = raw; // ⚡ LƯU GIÁ TRỊ THẬT
            fetchImage(name, raw, setLoadingImages, setImages);
          } else {
            initial[name] = ""; // không có ảnh
          }
          break;

        default:
          initial[name] = raw != null ? raw : "";
      }
    });

    setFormData(initial);
    setOriginalItem(item ? { ...item } : {});
  }, [fieldActive, item]);

  /* ===== ENUM / REFERENCE ===== */
  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  // Auto load reference có parent khi mở màn hình EDIT
  useEffect(() => {
    fieldActive.forEach((f) => {
      if (f.typeProperty === TypeProperty.Reference && f.parentsFields) {
        const parents = f.parentsFields.split(","); // ["ID_Complex", "ID_Building"]
        const haveAllParents = parents.every((p) => formData[p]); // check từng field có value

        if (haveAllParents) {
          const parentValues = parents.map((p) => formData[p]).join(",");
          fetchReferenceByFieldWithParent(
            f.referenceName!,
            f.name,
            parentValues,
            setReferenceData,
          );
        }
      }
    });
  }, [formData]); // chạy khi formData được set từ item lúc mở màn hình

  /* ===== IMAGE LOADER ===== */
  useImageLoader({
    fieldActive,
    formData,
    fetchImage,
    setImages,
    setLoadingImages,
  });

  // handle change & cascade
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

  /* ===== OPEN ENUM & REFERANCE MODAL ===== */
  const { openReferenceModal, loadReferenceModalData } = useOpenReferenceModal({
    formData,
    setActiveEnumField,
    setRefKeyword,
    setRefPage,
    setRefHasMore,
    setModalVisible,
    setReferenceData,
    pageSize: PAGE_SIZE,
  });

  // ===== MODAL ITEMS ===== //
  const modalItems = useModalItems(
    activeEnumField,
    referenceData,
    enumData,
    formData,
  );
  const { showAlertIfActive } = useSafeAlert();

  // SUBMIT - UPDATE
  const handleUpdate = async () => {
    try {
      if (!originalItem?.id) {
        Alert.alert("Lỗi", "Không tìm thấy ID để cập nhật!");
        return;
      }

      const entity: Record<string, any> = {};

      fieldActive.forEach((f) => {
        const key = f.name;
        const value = formData[key];

        switch (f.typeProperty) {
          // DATE
          case TypeProperty.Date:
            entity[key] = value ? formatDateForBE(value) : null;
            break;

          // NUMBER (INT / DECIMAL)
          case TypeProperty.Int:
          case TypeProperty.Decimal:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : Number(value);
            break;

          // TEXT / STRING
          case TypeProperty.Text:
          case TypeProperty.String:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          // ENUM / REFERENCE
          case TypeProperty.Enum:
          case TypeProperty.Reference:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
            break;

          // IMAGE
          case TypeProperty.Image:
            if (value === "---") {
              // người dùng bấm nút X xoá ảnh
              entity[key] = "";
            } else {
              entity[key] =
                value === "" || value === null || value === undefined
                  ? null
                  : value;
            }
            break;

          // DEFAULT
          default:
            entity[key] =
              value === "" || value === null || value === undefined
                ? null
                : value;
        }
      });

      // XOÁ field _MoTa khỏi payload (Reference)
      Object.keys(entity).forEach((k) => {
        if (k.endsWith("_MoTa")) delete entity[k];
      });

      const body = {
        entity,
        iDs: [originalItem.id],
        lstIncludeProperties: [],
        lstExcludeProperties: [],
        saveHistory: true,
      };

      if (!nameClass) {
        Alert.alert("Lỗi", "Không tìm thấy nameClass để update!");
        return;
      }

      await update(nameClass, body);

      showAlertIfActive("Thành công", "Cập nhật thành công!", [
        {
          text: "OK",
          onPress: () => {
            setFormData({});
            setImages({});

            // báo detail reload lại
            dispatch(setShouldRefreshDetails(true));
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      showAlertIfActive("Lỗi", "Không thể cập nhật dữ liệu!");
    }
  };

  // reset
  const handleReset = () => {
    if (!originalItem) return;

    const reset: Record<string, any> = {};

    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      switch (f.typeProperty) {
        case TypeProperty.Date:
          reset[f.name] = raw ? normalizeDateFromBE(raw) : "";
          break;

        case TypeProperty.Image:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Link:
          reset[f.name] = raw ?? "";
          break;

        case TypeProperty.Reference:
          const rawText =
            (matchedKey && originalItem?.[`${matchedKey}_MoTa`]) ??
            originalItem?.[`${f.name}_MoTa`];
          reset[f.name] = raw != null ? raw : rawText ?? "";
          break;

        default:
          reset[f.name] = raw != null ? raw : "";
      }
    });

    // Update formData trước
    setFormData(reset);

    // xử lý image preview sau
    fieldActive.forEach((f) => {
      const matchedKey = getMatchedKey(originalItem || {}, f.name);
      const raw = matchedKey ? originalItem[matchedKey] : undefined;

      if (f.typeProperty === TypeProperty.Image) {
        if (!raw || raw === "---") {
          setImages((p) => ({ ...p, [f.name]: "" }));
          return; // stop
        }

        fetchImage(f.name, raw, setLoadingImages, setImages);
      }
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="create-outline" size={20} color="#3B5BDB" />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Cập nhật tài sản</Text>
            <Text style={styles.heroSub}>
              Chỉnh sửa thông tin theo từng nhóm và lưu lại khi hoàn tất.
            </Text>
          </View>
        </View>

        {Object.entries(groupedFields).map(([groupName, fields]) => {
          const collapsed = collapsedGroups[groupName];
          return (
            <View key={groupName} style={styles.groupCard}>
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(groupName)}
              >
                <View style={styles.groupTitleWrap}>
                  <View style={styles.groupIconWrap}>
                    <Ionicons name="albums-outline" size={16} color={BRAND_RED} />
                  </View>
                  <Text style={styles.groupTitle}>{groupName}</Text>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons
                    name={collapsed ? "chevron-down" : "chevron-up"}
                    size={14}
                    color={BRAND_RED}
                  />
                </View>
              </TouchableOpacity>

              {!collapsed &&
                fields.map((f) => {
                  if (f.isReadOnly) return null; // ẨN TOÀN BỘ FIELD

                  return (
                    <View key={f.id ?? f.name} style={styles.fieldBlock}>
                      <Text style={styles.label}>{f.moTa ?? f.name}</Text>
                      <RenderInputByType
                        openEnumReferanceModal={openReferenceModal}
                        f={f}
                        formData={formData}
                        enumData={enumData}
                        referenceData={referenceData}
                        images={images}
                        setLoadingImages={setLoadingImages}
                        loadingImages={loadingImages}
                        handleChange={handleChange}
                        pickImage={pickImage}
                        setImages={setImages}
                        mode="edit"
                        styles={styles}
                        getDefaultValueForField={getDefaultValueForField}
                      />
                    </View>
                  );
                })}
            </View>
          );
        })}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.updateButton, { flex: 1 }]}
            onPress={handleUpdate}
          >
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.updateButtonText}>Cập nhật</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.resetButton, { flex: 1 }]}
            onPress={() =>
              Alert.alert(
                "Xác nhận",
                "Bạn muốn đặt lại mọi thay đổi về giá trị ban đầu?",
                [
                  { text: "Huỷ", style: "cancel" },
                  { text: "Đặt lại", onPress: handleReset },
                ],
              )
            }
          >
            <Ionicons name="refresh-outline" size={18} color={BRAND_RED} />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EnumAndReferencePickerModal
        isSearching={refSearching}
        loadingMore={refLoadingMore}
        visible={modalVisible}
        title={`${activeEnumField?.moTa || activeEnumField?.name}`}
        items={modalItems}
        selectedValue={activeEnumField ? formData[activeEnumField.name] : null}
        total={
          activeEnumField
            ? referenceData[activeEnumField.name]?.totalCount || 0
            : 0
        }
        loadedCount={
          activeEnumField
            ? (referenceData[activeEnumField.name]?.items ?? []).filter(
                (i) => i.value !== "",
              ).length
            : 0
        }
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          if (activeEnumField) {
            const selectedItem = modalItems.find((item) => item.value == value);
            let finalValue = value;
            if (value !== "" && !isNaN(value)) {
              finalValue = Number(value);
            }
            handleChange(activeEnumField.name, finalValue);
            setFormData((prev) => ({
              ...prev,
              [`${activeEnumField.name}_MoTa`]:
                value === "" ? "" : selectedItem?.text ?? String(value),
            }));
          }
          setModalVisible(false);
        }}
        onSearch={(textSearch) => {
          if (!activeEnumField) return;

          setRefSearching(true);
          setRefKeyword(textSearch);
          setRefPage(0);
          setRefHasMore(true);

          loadReferenceModalData(activeEnumField, {
            textSearch,
            page: 0,
            append: false,
          }).finally(() => setRefSearching(false));
        }}
        onLoadMore={() => {
          if (!activeEnumField || refLoadingMore || refSearching || !refHasMore)
            return;

          const fieldName = activeEnumField.name;
          const ref = referenceData[fieldName];

          if (!ref) return;

          // guard cực mạnh
          if (!ref || ref.totalCount <= ref.items.length) {
            setRefHasMore(false);
            return;
          }

          setRefLoadingMore(true);

          loadReferenceModalData(activeEnumField, {
            textSearch: refKeyword,
            page: refPage + 1,
            append: true,
          }).finally(() => {
            setRefPage((p) => p + 1);
            setRefLoadingMore(false);
          });
        }}
      />

      {refLoadingMore && <IsLoading size="large" color={BRAND_RED}></IsLoading>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    flexDirection: "row",
    alignItems: "center",
    ...CARD_SHADOW,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1923",
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 12,
    color: "#8A95A3",
    lineHeight: 18,
  },
  groupCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
    ...CARD_SHADOW,
  },

  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  groupTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFF3F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  groupTitle: { fontSize: 15, fontWeight: "700", color: "#0F1923", flex: 1 },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3F3",
  },
  fieldBlock: { marginBottom: 14 },
  label: {
    fontSize: 13.5,
    fontWeight: "600",
    marginBottom: 7,
    color: "#374151",
  },

  input: {
    borderWidth: 1,
    borderColor: "#E3E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#0F1923",
    backgroundColor: "#FBFCFE",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },

  updateButton: {
    backgroundColor: BRAND_RED,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
    ...CARD_SHADOW,
  },
  updateButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  resetButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FFD6D6",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },

  resetButtonText: { color: BRAND_RED, fontSize: 16, fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#E3E8F0",
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    color: "#0F1923",
    backgroundColor: "#FBFCFE",
    textAlignVertical: "top",
  },

  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#FFD6D6",
    borderRadius: 12,
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

  boolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  boolLabel: {
    flex: 1,
    paddingRight: 12,
  },

  tooltipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
  },

  tooltipLabel: {
    color: BRAND_RED,
    fontWeight: "600",
    fontSize: 14,
  },

  tooltipText: {
    color: "#333",
    fontSize: 14,
    flexShrink: 1,
  },
});
