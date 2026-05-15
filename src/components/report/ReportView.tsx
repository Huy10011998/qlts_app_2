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
import { error } from "../../utils/Logger";
import { formatToSlash, validateDates } from "../../utils/Date";
import { DatePicker } from "../dataPicker/DataPicker";
import { useSafeAlert } from "../../hooks/useSafeAlert";
import { C } from "../../utils/helpers/colors";

const ReportView: React.FC<ReportViewProps> = ({ title, onClose }) => {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { isMounted, showAlertIfActive } = useSafeAlert();

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
        API_ENDPOINTS.PREVIEW_MAYTINH_THONGKE_CNTT,
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
      error("Lỗi khi gọi API:", err);
      showAlertIfActive("Lỗi", "Không thể tải báo cáo.");
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          Platform.OS === "ios" ? styles.headerIos : styles.headerAndroid,
        ]}
      >
        <Text style={styles.title}>{title}</Text>

        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <DatePicker
          value={fromDate.replace(/\//g, "-")}
          onChange={(val) => setFromDate(formatToSlash(val))}
        />

        <DatePicker
          value={toDate.replace(/\//g, "-")}
          onChange={(val) => setToDate(formatToSlash(val))}
        />

        <TouchableOpacity
          style={[
            styles.submitButton,
            loading && styles.submitButtonLoading,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Thực hiện</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.reportContainer}>
        {reportHtml && (
          <WebView
            originWhitelist={["*"]}
            source={{ html: reportHtml }}
            style={styles.reportWebView}
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: C.red,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  headerIos: {
    paddingTop: 50,
  },
  headerAndroid: {
    paddingTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#fff",
  },
  form: {
    padding: 16,
    gap: 12,
  },
  submitButton: {
    backgroundColor: C.red,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  submitButtonLoading: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold" as const,
  },
  reportContainer: {
    flex: 1,
  },
  reportWebView: {
    flex: 1,
  },
};
