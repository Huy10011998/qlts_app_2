import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RenderInputByType } from "../../form/RenderInputByType";

type AssetFormGroupedFieldsProps = {
  collapsedGroups: Record<string, boolean>;
  enumData: Record<string, any[]>;
  formData: Record<string, any>;
  getDefaultValueForField: (field: any, formData?: Record<string, any>) => any;
  groupedFields: Record<string, any[]>;
  handleChange: (name: string, value: any) => void;
  images: Record<string, string>;
  loadingImages: Record<string, boolean>;
  mode: "add" | "edit" | "clone";
  openReferenceModal: (field: any) => void;
  pickImage: (...args: any[]) => void;
  referenceData: Record<string, { items: any[]; totalCount: number }>;
  setImages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setLoadingImages: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  styles: any;
  toggleGroup: (groupName: string) => void;
};

export default function AssetFormGroupedFields({
  collapsedGroups,
  enumData,
  formData,
  getDefaultValueForField,
  groupedFields,
  handleChange,
  images,
  loadingImages,
  mode,
  openReferenceModal,
  pickImage,
  referenceData,
  setImages,
  setLoadingImages,
  styles,
  toggleGroup,
}: AssetFormGroupedFieldsProps) {
  return (
    <>
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
                  <Ionicons name="albums-outline" size={16} color="#E31E24" />
                </View>
                <Text style={styles.groupTitle}>{groupName}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons
                  name={collapsed ? "chevron-down" : "chevron-up"}
                  size={14}
                  color="#E31E24"
                />
              </View>
            </TouchableOpacity>

            {!collapsed &&
              fields.map((field) => {
                if (field.isReadOnly) return null;

                return (
                  <View key={field.id ?? field.name} style={styles.fieldBlock}>
                    <Text style={styles.label}>{field.moTa ?? field.name}</Text>
                    <RenderInputByType
                      openEnumReferanceModal={openReferenceModal}
                      f={field}
                      formData={formData}
                      enumData={enumData}
                      referenceData={referenceData}
                      images={images}
                      setLoadingImages={setLoadingImages}
                      loadingImages={loadingImages}
                      handleChange={handleChange}
                      pickImage={pickImage}
                      setImages={setImages}
                      mode={mode}
                      styles={styles}
                      getDefaultValueForField={getDefaultValueForField}
                    />
                  </View>
                );
              })}
          </View>
        );
      })}
    </>
  );
}
