import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PropsEnum } from "../../types/Components.d";

export default function EnumAndReferencePickerModal({
  visible,
  title,
  items,
  onClose,
  onSelect,
}: PropsEnum) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      {/* Overlay - bấm ra ngoài để đóng */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <SafeAreaView edges={["bottom"]} style={styles.modalContainer}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Title */}
        <Text style={styles.modalTitle}>{title}</Text>

        {/* List */}
        <ScrollView
          style={styles.listWrapper}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.modalItem}
              activeOpacity={0.7}
              onPress={() => onSelect(item.value)}
            >
              <Text style={styles.modalItemText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Close button */}
        <TouchableOpacity
          onPress={onClose}
          style={styles.modalCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.modalCancelText}>Đóng</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  /* Overlay */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  /* Modal container */
  modalContainer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxHeight: "85%",

    backgroundColor: "#fff",
    paddingTop: 8,
    paddingHorizontal: 16,

    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  /* Drag handle */
  dragHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 4,
    marginBottom: 12,
  },

  /* Title */
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#000",
  },

  /* List */
  listWrapper: {
    flexGrow: 1,
    marginBottom: 12,
  },

  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  modalItemText: {
    fontSize: 15,
    color: "#000",
  },

  /* Cancel */
  modalCancel: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f2f2f2",
  },

  modalCancelText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});
