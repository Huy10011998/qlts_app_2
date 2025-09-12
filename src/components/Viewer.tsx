import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import Pdf from "react-native-pdf";
import RNFetchBlob from "react-native-blob-util";

interface ViewerProps {
  visible: boolean;
  onClose: () => void;
  params: {
    name: string;
    path: string;
    nameClass: string;
  };
}

export default function Viewer({ visible, onClose, params }: ViewerProps) {
  const [localFile, setLocalFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && params?.path) {
      const fetchPdf = async () => {
        try {
          setLoading(true);
          const res = await RNFetchBlob.config({
            fileCache: true,
            appendExt: "pdf",
          }).fetch("GET", params.path);

          setLocalFile(res.path()); // local file path
        } catch (error) {
          console.error(error);
          Alert.alert("Lỗi", "Không thể tải file PDF.");
          onClose();
        } finally {
          setLoading(false);
        }
      };

      fetchPdf();
    } else {
      setLocalFile(null);
    }
  }, [visible, params]);

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide">
      <View style={styles.container}>
        {loading && <ActivityIndicator size="large" color="#FF3333" />}
        {localFile && (
          <Pdf
            source={{ uri: `file://${localFile}` }}
            style={styles.pdf}
            onError={(error) => {
              console.log(error);
              Alert.alert("Lỗi", "Không đọc được file PDF.");
              onClose();
            }}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  pdf: { flex: 1, width: "100%" },
});
