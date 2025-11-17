import React, { useState } from "react";
import {
  View,
  Text,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { WebView } from "react-native-webview";
import { ReportViewProps } from "../../types";
import { getPreviewBC } from "../../services/data/CallApi";
import { API_ENDPOINTS } from "../../config/Index";
import { validateDates } from "../../utils/Helper";
import { DatePickerModalIOS } from "../modal/DatePickerModal";

const ReportView: React.FC<ReportViewProps> = ({ title, onClose }) => {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Convert "dd-MM-yyyy" → "dd/MM/yyyy"
  const formatToSlash = (str: string) => str.replace(/-/g, "/");

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
          justifyContent: "space-between",
          alignItems: "center",
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
      <View style={{ padding: 16, gap: 12 }}>
        <DatePickerModalIOS
          value={fromDate.replace(/\//g, "-")} // convert dd/MM/yyyy → dd-MM-yyyy
          onChange={(val) => setFromDate(formatToSlash(val))}
        />

        <DatePickerModalIOS
          value={toDate.replace(/\//g, "-")}
          onChange={(val) => setToDate(formatToSlash(val))}
        />

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

      {/* Hiển thị PDF */}
      <View style={{ flex: 1 }}>
        {reportHtml && (
          <WebView
            originWhitelist={["*"]}
            source={{ html: reportHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            nestedScrollEnabled
            scalesPageToFit
          />
        )}
      </View>
    </View>
  );
};

export default ReportView;
