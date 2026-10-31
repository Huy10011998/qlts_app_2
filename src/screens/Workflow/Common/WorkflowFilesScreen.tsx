import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { useRoute } from "@react-navigation/native";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import { useAutoReload } from "../../../hooks/useAutoReload";
import {
  deleteWorkflowFile,
  getWorkflowFiles,
  uploadWorkflowFile,
} from "../../../services/data/workflowApi";
import type { StackRoute, WorkflowFileItem, WorkflowPickedFile } from "../../../types/index";
import { AppColors, useStyles } from "../../../utils/helpers/colors";
import { useAttachmentPicker } from "../shared/components/AttachmentPicker";
import WorkflowFab from "../shared/components/WorkflowFab";
import WorkflowFileImage from "../shared/components/WorkflowFileImage";
import WorkflowFileRow from "../shared/components/WorkflowFileRow";
import WorkflowFilesSkeleton from "../shared/components/WorkflowFilesSkeleton";
import { useWorkflowFileOpener } from "../shared/useWorkflowFileOpener";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import { useNotifyInfoStaleOnClose } from "../shared/workflowInfoRefresh";
import { formatFileSizeKb, isImageFileName } from "../shared/workflowAttachments";
import { formatBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { AppAlert } from "../../../components/ui/AppAlert";
import { showAppToast } from "../../../components/ui/AppToast";

/**
 * File đính kèm của phiếu / công việc. Thêm, xoá khi được phép (phiếu: nháp
 * của người lập; công việc: quyen.duocTraoDoi).
 */
export default function WorkflowFilesScreen() {
  const styles = useStyles(makeStyles);
  const route = useRoute<StackRoute<"WorkflowFile">>();
  const { apiBase, idHoSo, canEdit } = route.params;
  // Đóng màn → danh sách / chi tiết bên dưới nạp lại số file.
  useNotifyInfoStaleOnClose(apiBase);
  const markChanged = useMarkWorkflowChanged();
  const fileOpener = useWorkflowFileOpener();

  const [items, setItems] = useState<WorkflowFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getWorkflowFiles(apiBase, idHoSo));
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được danh sách file."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiBase, idHoSo]);

  useEffect(() => {
    load();
  }, [load]);

  // App vừa từ nền về: người khác có thể vừa thêm / xoá file.
  useAutoReload(load);

  const upload = async (files: WorkflowPickedFile[]) => {
    setBusy(true);
    const failed: string[] = [];
    for (const file of files) {
      try {
        await uploadWorkflowFile(apiBase, idHoSo, file);
      } catch (err) {
        failed.push(`- ${file.name}: ${getWorkflowErrorMessage(err, "lỗi tải lên")}`);
      }
    }
    // Tắt vòng xoay sau khi danh sách đã nạp lại — không thì có lúc vòng xoay
    // tắt mà file mới chưa hiện.
    await load();
    setBusy(false);
    markChanged();
    const uploaded = files.length - failed.length;
    if (failed.length) AppAlert.alert("Có file chưa tải lên được", failed.join("\n"));
    if (uploaded) showAppToast({ message: `Đã tải lên ${uploaded} file` });
  };

  const picker = useAttachmentPicker(upload, true);

  const confirmDelete = (file: WorkflowFileItem) =>
    AppAlert.alert("Xoá file", `Xoá "${file.name}"?`, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            setBusy(true);
            await deleteWorkflowFile(apiBase, file.id);
            await load();
            markChanged();
            showAppToast({ message: "Đã xoá file", detail: file.name });
          } catch (err) {
            AppAlert.alert("Không xoá được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <View style={styles.container}>
      {/* Chỉ phần danh sách chờ: nút tải lên theo `canEdit` của route param, biết
          ngay từ đầu — trước đây khung chờ thay cả màn nên nút tròn 56 bật ra
          ở góc lúc dữ liệu về. Nút vẫn bấm được lúc đang tải: tải lên xong màn
          tự nạp lại danh sách. */}
      {loading ? (
        <WorkflowFilesSkeleton />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <WorkflowFileRow
                name={item.name}
                meta={[
                  formatFileSizeKb(item.fileSize),
                  item.iD_User_MoTa,
                  formatBeDate(item.uploadedAt, true),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                thumbnail={
                  isImageFileName(item.name) ? (
                    <WorkflowFileImage
                      apiBase={apiBase}
                      fileId={item.id}
                      name={item.name}
                      square={56}
                      onPress={() => fileOpener.openFile(apiBase, item)}
                    />
                  ) : undefined
                }
                onPress={() => fileOpener.openFile(apiBase, item)}
                onRemove={canEdit ? () => confirmDelete(item) : undefined}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="folder-open-outline"
              title={errorMessage ? "Không tải được file" : "Chưa có file đính kèm"}
              subtitle={errorMessage ?? undefined}
              actionLabel={errorMessage ? "Thử lại" : undefined}
              onActionPress={errorMessage ? load : undefined}
            />
          }
        />
      )}

      {canEdit ? <WorkflowFab icon="cloud-upload-outline" onPress={picker.open} /> : null}
      {picker.sheet}
      {fileOpener.viewer}
      {busy || fileOpener.opening ? <IsLoading style={styles.overlay} /> : null}
    </View>
  );
}

const makeStyles = (c: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    listContent: {
      padding: 12,
      paddingBottom: 96,
      flexGrow: 1,
    },
    row: {
      backgroundColor: c.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 4,
      marginBottom: 8,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: c.loadingOverlay,
    },
  });
