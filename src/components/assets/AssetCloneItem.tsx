import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { RenderInputByType } from "../form/RenderInputByType";
import { useImageLoader } from "../../hooks/useImageLoader";
import { useNavigation } from "@react-navigation/native";
import { setShouldRefreshList } from "../../store/AssetSlice";

import {
  formatDateForBE,
  getDefaultValueForField,
  normalizeDateFromBE,
} from "../../utils/Date";

import { insert } from "../../services/data/CallApi";
import { useAppDispatch } from "../../store/Hooks";
import { RootState } from "../../store";
import { useSelector } from "react-redux";
import { useGroupedFields } from "../../hooks/AssetAddItem/useGroupedFields";
import { useEnumAndReferenceLoader } from "../../hooks/AssetAddItem/useEnumAndReferenceLoader";
import { useAutoIncrementCode } from "../../hooks/AssetAddItem/useAutoIncrementCode";
import IsLoading from "../ui/IconLoading";
import { useOpenReferenceModal } from "../../hooks/AssetAddItem/useOpenReferenceModal";
import { useReferenceFetcher } from "../../hooks/AssetAddItem/useReferenceData";
import { useModalItems } from "../../hooks/AssetAddItem/useModalItems";

export default function AssetCloneItem() {
  /* ===== PARAMS ===== */
  const { item, field, propertyClass, nameClass } = useParams();
  const navigation = useNavigation<AssetCloneItemNavigationProp>();
  const dispatch = useAppDispatch();

  // State
  const [formData, setFormData] = useState<Record<string, any>>({});

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

  /* ===== REDUX ===== */
  const { selectedTreeValue } = useSelector((state: RootState) => state.asset);

  //  ===== RAW TREE VALUES ===== //
  const rawTreeValues = useMemo(() => {
    if (!selectedTreeValue) return [];
    return selectedTreeValue.split(",").map((v) => v.trim());
  }, [selectedTreeValue]);

  /* ===== GROUP + FIELD ===== */
  const { fieldActive, groupedFields, collapsedGroups, toggleGroup } =
    useGroupedFields(field);

  const didInitRef = useRef(false);
  // Init formData từ item gốc (nhưng xoá ID)
  useEffect(() => {
    const initial: Record<string, any> = {};

    if (didInitRef.current) return;
    didInitRef.current = true;

    const autoField = propertyClass?.propertyTuDongTang;

    fieldActive.forEach((f) => {
      const name = f.name;

      //  CLONE → KHÔNG COPY AUTO CODE
      if (name === autoField) {
        // KHÔNG set gì hết -> backend auto
        return;
      }

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
  }, []);

  /* ===== ENUM / REFERENCE ===== */
  useEnumAndReferenceLoader(
    fieldActive,
    setEnumData,
    setReferenceData,
    referenceData,
  );

  /* ===== AUTO INCREMENT ===== */
  const parentField = propertyClass?.prentTuDongTang;
  const parentValue = parentField ? formData[parentField] : undefined;

  useAutoIncrementCode({
    nameClass,
    propertyClass,
    formData,
    rawTreeValues,
    parentValue,
    setFormData,
  });

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
            setReferenceData,
          );
        }
      }
    });
  }, [formData]);

  /* ===== IMAGE LOADER ===== */
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

  /* ===== OPEN ENUM & REFERANCE MODAL ===== */
  const { openReferenceModal } = useOpenReferenceModal({
    formData,
    setActiveEnumField,
    setRefKeyword,
    setRefPage,
    setRefHasMore,
    setModalVisible,
    setReferenceData,
    pageSize: PAGE_SIZE,
  });

  /* ===== FETCH REFERENCE DATA ON SEARCH ===== */
  const { fetchReferenceData } = useReferenceFetcher(
    setReferenceData,
    PAGE_SIZE,
  );

  // ===== MODAL ITEMS ===== //
  const modalItems = useModalItems(activeEnumField, referenceData, enumData);

  // SUBMIT - CLONE
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
        (k) => payloadData[k] && delete payloadData[k],
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
        (k) => k.endsWith("_MoTa") && delete payloadData[k],
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
        { cancelable: false },
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
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
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
                        openEnumReferanceModal={openReferenceModal}
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
        isSearching={refSearching}
        loadingMore={refLoadingMore}
        visible={modalVisible}
        title={`${activeEnumField?.moTa || activeEnumField?.name}`}
        items={modalItems}
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
            let finalValue = value;
            if (value !== "" && !isNaN(value)) {
              finalValue = Number(value);
            }
            handleChange(activeEnumField.name, finalValue);
          }
          setModalVisible(false);
        }}
        onSearch={(textSearch) => {
          if (!activeEnumField) return;

          setRefSearching(true);
          setRefKeyword(textSearch);
          setRefPage(0);
          setRefHasMore(true);

          fetchReferenceData(activeEnumField, {
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

          fetchReferenceData(activeEnumField, {
            textSearch: refKeyword,
            page: refPage + 1,
            append: true,
          }).finally(() => {
            setRefPage((p) => p + 1);
            setRefLoadingMore(false);
          });
        }}
      />

      {refLoadingMore && <IsLoading size="large" color="#FF3333"></IsLoading>}
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
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#333" },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#333",
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
    color: "#FF3333",
    fontWeight: "600",
    fontSize: 14,
  },

  tooltipText: {
    color: "#333",
    fontSize: 14,
    flexShrink: 1,
  },
});
