import React, { useState } from "react";
import {
  View,
  Text,
  Platform,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Ionicons from "react-native-vector-icons/Ionicons";
import { WebView } from "react-native-webview";
import { ReportViewProps } from "../../types";
import { getPreviewBC } from "../../services/data/CallApi";
import { API_ENDPOINTS } from "../../config/Index";
import { validateDates } from "../../utils/Helper";

const ReportView: React.FC<ReportViewProps> = ({ title, onClose }) => {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [showPicker, setShowPicker] = useState(false);
  const [currentField, setCurrentField] = useState<"from" | "to" | null>(null);
  const [tempDate, setTempDate] = useState(new Date());

  // Khi chọn ngày trong picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    const current = selectedDate || tempDate;
    setTempDate(current);
  };

  // Nhấn "Chọn" trên toolbar
  const handleConfirmDate = () => {
    const selected = tempDate;
    const formatted = `${("0" + selected.getDate()).slice(-2)}/${(
      "0" +
      (selected.getMonth() + 1)
    ).slice(-2)}/${selected.getFullYear()}`;
    if (currentField === "from") setFromDate(formatted);
    if (currentField === "to") setToDate(formatted);
    setShowPicker(false);
  };

  // Nhấn "Hủy"
  const handleCancelDate = () => setShowPicker(false);

  const handleSubmit = async () => {
    if (!fromDate || !toDate) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ Từ ngày và Đến ngày.");
      return;
    }

    const result = validateDates(fromDate, toDate);
    if (!result) return;

    const { from, to } = result;

    try {
      setLoading(true);
      const res = await getPreviewBC(
        { tuNgay: from, denNgay: to, isPreview: true },
        API_ENDPOINTS.PREVIEW_MAYTINH_THONGKE_CNTT
      );

      const html = `
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=0.5, maximum-scale=3.0, user-scalable=yes">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.min.js"></script>
    <style>
      body { margin:0; padding:0; overflow-x:hidden; overflow-y:auto; background:#f5f5f5; }
      #container { display:flex; flex-direction:column; align-items:center; padding:10px; }
      canvas { max-width:100% !important; height:auto !important; margin-bottom:12px; border:1px solid #ccc; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
    </style>
  </head>
  <body>
    <div id="container"></div>
    <script>
      const pdfData = "${res.data}";
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';
      const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData) });
      loadingTask.promise.then(pdf => {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          pdf.getPage(pageNum).then(page => {
            const scale = 2.5;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            document.getElementById('container').appendChild(canvas);
            page.render({ canvasContext: context, viewport });
          });
        }
      });
    </script>
  </body>
</html>
`;
      setReportHtml(html);
    } catch (err) {
      console.error("Lỗi khi gọi API:", err);
      Alert.alert("Lỗi", "Không thể tải báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  // Mở date picker và khởi tạo đúng tempDate
  const openPicker = (field: "from" | "to", dateStr: string) => {
    setCurrentField(field);
    if (dateStr) {
      const [d, m, y] = dateStr.split("/").map(Number);
      setTempDate(new Date(y, m - 1, d));
    } else {
      setTempDate(new Date());
    }
    setShowPicker(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 50 : 20,
          paddingHorizontal: 16,
          paddingBottom: 10,
          backgroundColor: "#FF3333",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff" }}>
          {title}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bộ lọc ngày */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openPicker("from", fromDate)}
        >
          <View pointerEvents="none">
            <TextInput
              style={styles.input}
              placeholder="Từ ngày (dd/mm/yyyy)"
              placeholderTextColor="#999"
              value={fromDate}
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openPicker("to", toDate)}
        >
          <View pointerEvents="none">
            <TextInput
              style={styles.input}
              placeholder="Đến ngày (dd/mm/yyyy)"
              placeholderTextColor="#999"
              value={toDate}
              editable={false}
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            backgroundColor: "#FF3333",
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
              Thực hiện
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={handleCancelDate}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={handleCancelDate}
        >
          <View style={styles.pickerContainer}>
            {/* Toolbar Hủy/Chọn */}
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleCancelDate}>
                <Text style={styles.toolbarText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirmDate}>
                <Text style={[styles.toolbarText, { fontWeight: "bold" }]}>
                  Chọn
                </Text>
              </TouchableOpacity>
            </View>

            {/* Container cố định cho DatePicker */}
            <View
              style={{
                backgroundColor: "#fff",
                height: 250,
                width: "100%",
                alignItems: "center",
              }}
            >
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                // maximumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Hiển thị PDF */}
      <View style={{ flex: 1 }}>
        {reportHtml && (
          <WebView
            originWhitelist={["*"]}
            source={{ html: reportHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit={true}
            androidHardwareAccelerationDisabled={false}
            nestedScrollEnabled={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 10,
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  pickerContainer: {
    backgroundColor: "#fff",
    paddingBottom: 20,
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  toolbarText: {
    fontSize: 16,
    color: "#FF3333",
  },
});

export default ReportView;
