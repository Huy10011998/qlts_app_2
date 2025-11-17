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
import { PropsEnum } from "../../types/Components.d";

export default function EnumPickerModal({
  visible,
  title,
  items,
  onClose,
  onSelect,
}: PropsEnum) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible}>
      {/* Overlay - bấm ra ngoài để đóng */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay} />
      </TouchableWithoutFeedback>

      {/* Modal Content */}
      <View style={styles.modalContainer}>
        {/* Drag Handle */}
        <View style={styles.dragHandle} />

        <Text style={styles.modalTitle}>{title}</Text>

        <ScrollView style={styles.listWrapper}>
          {items.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.modalItem}
              onPress={() => onSelect(item.value)}
            >
              <Text style={styles.modalItemText}>{item.text}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
          <Text style={styles.modalCancelText}>Đóng</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  modalContainer: {
    backgroundColor: "#fff",
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    height: "92%",
    position: "absolute",
    bottom: 0,
    width: "100%",
  },

  dragHandle: {
    width: 45,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 12,
    marginTop: 4,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    color: "#000",
  },

  listWrapper: {
    flexGrow: 1,
    marginBottom: 20,
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

  modalCancel: {
    marginTop: 12,
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
