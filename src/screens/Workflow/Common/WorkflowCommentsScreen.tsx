import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EmptyState from "../../../components/ui/EmptyState";
import IsLoading from "../../../components/ui/IconLoading";
import {
  addWorkflowComment,
  getWorkflowComments,
} from "../../../services/data/workflowApi";
import type {
  StackRoute,
  WorkflowComment,
  WorkflowPickedFile,
} from "../../../types/index";
import { AppColors, useAppColors, useStyles } from "../../../utils/helpers/colors";
import { useAttachmentPicker } from "../shared/components/AttachmentPicker";
import WorkflowCommentsSkeleton from "../shared/components/WorkflowCommentsSkeleton";
import TypingIndicator from "../shared/components/TypingIndicator";
import WorkflowFileImage from "../shared/components/WorkflowFileImage";
import { useWorkflowFileOpener } from "../shared/useWorkflowFileOpener";
import { useWorkflowMe } from "../shared/useWorkflowMe";
import { useMarkWorkflowChanged } from "../shared/useWorkflowVersion";
import { formatFileSizeKb, isImageFileName } from "../shared/workflowAttachments";
import { formatBeDate } from "../shared/workflowDate";
import { getWorkflowErrorMessage } from "../shared/workflowErrors";
import { useNotifyInfoStaleOnClose } from "../shared/workflowInfoRefresh";
import { mergeRealtimeComment } from "./realtimeCommentRules";
import { useRealtimeComments } from "./useRealtimeComments";

/**
 * Bình luận dạng chat — dùng chung phiếu đề nghị (`/{TenBang}/flow-*`) và
 * công việc (`/CV_CongViec/flow-*`). Chỉ thêm, không sửa / xoá; bình luận của
 * mình dồn phải. Mỗi bình luận kèm tối đa 1 file 20MB.
 *
 * Realtime (7-Mobile-Realtime-BinhLuan): bình luận người khác gửi hiện ngay,
 * "{Tên} đang nhập" cuối khung. Mất realtime thì vẫn chạy như cũ.
 */
/** Cách cuối danh sách chừng này px vẫn coi là "đang ở cuối". */
const NEAR_BOTTOM_PX = 80;

export default function WorkflowCommentsScreen() {
  const styles = useStyles(makeStyles);
  const c = useAppColors();
  const insets = useSafeAreaInsets();
  const route = useRoute<StackRoute<"WorkflowBinhLuan">>();
  const { apiBase, idHoSo, canSend } = route.params;
  const { me } = useWorkflowMe();
  const markChanged = useMarkWorkflowChanged();
  const fileOpener = useWorkflowFileOpener();
  const listRef = useRef<FlatList<WorkflowComment>>(null);
  const inputRef = useRef<TextInput>(null);
  // Đang ở (gần) cuối danh sách thì nội dung đổi cỡ mới kéo về cuối — người đang
  // cuộn lên đọc tin cũ không bị giật xuống khi ảnh tải xong / có người nhập.
  const atBottomRef = useRef(true);

  const [items, setItems] = useState<WorkflowComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<WorkflowPickedFile | null>(null);
  const [sending, setSending] = useState(false);
  const picker = useAttachmentPicker((files) => setFile(files[0] ?? null), false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  /* iOS: đẩy ô soạn lên đúng bằng bàn phím. Không dùng KeyboardAvoidingView vì
     nó cần biết chiều cao header (header tự vẽ) mới tính đúng offset. Android
     đã có adjustResize trong manifest. */
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const show = Keyboard.addListener("keyboardWillShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await getWorkflowComments(apiBase, idHoSo);
      setItems(rows);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(getWorkflowErrorMessage(err, "Không tải được bình luận."));
    } finally {
      setLoading(false);
    }
  }, [apiBase, idHoSo]);

  useEffect(() => {
    load();
  }, [load]);

  // apiBase chính là tenBang của phòng ("Ticket_PhongBan" / "CV_CongViec").
  const realtime = useRealtimeComments({
    tenBang: apiBase,
    idHoSo,
    myId: me.iD_NhanVien,
    onBinhLuanMoi: (comment) => setItems((prev) => mergeRealtimeComment(prev, comment)),
    onReconnected: load,
  });

  useNotifyInfoStaleOnClose(apiBase);

  const send = async () => {
    const noiDung = text.trim();
    if (!noiDung && !file) return;

    try {
      setSending(true);
      await addWorkflowComment(apiBase, idHoSo, noiDung, file);
      setText("");
      setFile(null);
      // Gửi xong thì hạ bàn phím, bỏ focus ô nhập (cũng là thôi "đang nhập").
      inputRef.current?.blur();
      Keyboard.dismiss();
      atBottomRef.current = true;
      await load();
      markChanged();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      Alert.alert("Không gửi được", getWorkflowErrorMessage(err, "Vui lòng thử lại."));
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: WorkflowComment }) => {
    const mine = !!me.iD_NhanVien && Number(item.iD_NhanVien) === me.iD_NhanVien;
    // Ảnh (chụp / chọn từ máy) đứng riêng ngoài bong bóng như Zalo / Messenger;
    // chữ và file khác vẫn nằm trong bong bóng.
    const isImage = !!item.iD_File && isImageFileName(item.tenFile);
    const hasBubble = !!item.noiDung || (!!item.iD_File && !isImage);
    const time = formatBeDate(item.ngayTao, true);

    return (
      <View style={[styles.messageRow, mine && styles.messageRowMine]}>
        <View style={[styles.stack, mine && styles.stackMine]}>
          {!mine && (isImage || !hasBubble) ? (
            <Text style={[styles.author, styles.authorBare]}>{item.iD_NhanVien_MoTa}</Text>
          ) : null}
          {isImage ? (
            <WorkflowFileImage
              apiBase={apiBase}
              fileId={Number(item.iD_File)}
              name={item.tenFile}
              onPress={() =>
                fileOpener.openFile(apiBase, { id: Number(item.iD_File), name: item.tenFile })
              }
            />
          ) : null}
          {hasBubble ? (
            <View
              style={[
                styles.bubble,
                mine ? styles.bubbleMine : styles.bubbleOther,
                isImage && styles.bubbleAfterImage,
              ]}
            >
              {!mine && !isImage ? <Text style={styles.author}>{item.iD_NhanVien_MoTa}</Text> : null}
              {item.noiDung ? (
                <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                  {item.noiDung}
                </Text>
              ) : null}
              {item.iD_File && !isImage ? (
                <TouchableOpacity
                  style={[styles.fileChip, mine && styles.fileChipMine]}
                  onPress={() =>
                    fileOpener.openFile(apiBase, { id: Number(item.iD_File), name: item.tenFile })
                  }
                >
                  <Ionicons name="document-attach-outline" size={16} color={mine ? "#FFFFFF" : c.accent} />
                  <Text
                    style={[styles.fileName, mine && styles.messageTextMine]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {item.tenFile ?? "Tệp đính kèm"}
                  </Text>
                  {item.fileSize ? (
                    <Text style={[styles.fileSize, mine && styles.messageTextMine]}>
                      {formatFileSizeKb(item.fileSize)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ) : null}
              <Text style={[styles.time, mine && styles.timeMine]}>{time}</Text>
            </View>
          ) : (
            <Text style={[styles.time, styles.timeBare]}>{time}</Text>
          )}
        </View>
      </View>
    );
  };

  const composerPaddingBottom = keyboardHeight ? 10 : Math.max(insets.bottom, 10);

  return (
    <View style={[styles.container, { paddingBottom: keyboardHeight }]}>
      {loading ? (
        <WorkflowCommentsSkeleton />
      ) : (
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => {
            if (atBottomRef.current) listRef.current?.scrollToEnd({ animated: false });
          }}
          onScroll={({ nativeEvent }) => {
            const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
            atBottomRef.current =
              contentOffset.y + layoutMeasurement.height >= contentSize.height - NEAR_BOTTOM_PX;
          }}
          scrollEventThrottle={64}
          // Chạm vào vùng tin nhắn (bấm hay kéo) = bỏ focus ô nhập. onTouchStart
          // không giành thao tác chạm nên cuộn và bấm ảnh / file vẫn như thường.
          onTouchStart={Keyboard.dismiss}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListFooterComponent={
            realtime.dangNhapLabel ? <TypingIndicator label={realtime.dangNhapLabel} /> : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="chatbubbles-outline"
              title={errorMessage ? "Không tải được bình luận" : "Chưa có bình luận"}
              subtitle={errorMessage ?? undefined}
              actionLabel={errorMessage ? "Thử lại" : undefined}
              onActionPress={errorMessage ? load : undefined}
            />
          }
        />
      )}

      {canSend ? (
        <View
          style={[
            styles.composer,
            { paddingBottom: composerPaddingBottom },
          ]}
        >
          {file ? (
            <View style={styles.pendingFile}>
              {isImageFileName(file.name) || file.type?.startsWith("image/") ? (
                <Image source={{ uri: file.uri }} style={styles.pendingThumb} />
              ) : (
                <Ionicons name="document-attach-outline" size={16} color={c.accent} />
              )}
              <Text style={styles.pendingName} numberOfLines={1} ellipsizeMode="middle">
                {file.name}
              </Text>
              <TouchableOpacity onPress={() => setFile(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={c.textSub} />
              </TouchableOpacity>
            </View>
          ) : null}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={picker.open} style={styles.iconButton} disabled={sending}>
              <Ionicons name="attach" size={22} color={c.textSub} />
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => realtime.setComposerFocused(true)}
              onBlur={() => realtime.setComposerFocused(false)}
              placeholder="Viết bình luận..."
              placeholderTextColor={c.placeholder}
              multiline
              style={styles.input}
            />
            <TouchableOpacity
              onPress={send}
              disabled={sending || (!text.trim() && !file)}
              style={[styles.sendButton, (sending || (!text.trim() && !file)) && styles.sendDisabled]}
            >
              {sending ? (
                <IsLoading size="small" color="#FFFFFF" style={styles.flexNone} />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={[styles.readOnly, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          Bạn chỉ xem được bình luận.
        </Text>
      )}

      {picker.sheet}
      {fileOpener.viewer}
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
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: 10,
    },
    messageRowMine: {
      justifyContent: "flex-end",
    },
    stack: {
      maxWidth: "82%",
      alignItems: "flex-start",
    },
    stackMine: {
      alignItems: "flex-end",
    },
    bubble: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bubbleAfterImage: {
      marginTop: 4,
    },
    bubbleOther: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 4,
    },
    bubbleMine: {
      backgroundColor: c.red,
      borderTopRightRadius: 4,
    },
    author: {
      fontSize: 12,
      fontWeight: "700",
      color: c.accent,
      marginBottom: 2,
    },
    authorBare: {
      marginLeft: 4,
    },
    messageText: {
      fontSize: 15,
      color: c.text,
    },
    messageTextMine: {
      color: "#FFFFFF",
    },
    fileChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 6,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    fileChipMine: {
      backgroundColor: "rgba(255,255,255,0.18)",
    },
    fileName: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "600",
      color: c.accent,
    },
    fileSize: {
      fontSize: 11,
      color: c.textSub,
    },
    time: {
      fontSize: 11,
      color: c.textSub,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    timeMine: {
      color: "rgba(255,255,255,0.8)",
    },
    // Giờ dưới ảnh đứng riêng: chữ xám trên nền màn, không có bong bóng.
    timeBare: {
      alignSelf: "auto",
      marginHorizontal: 4,
    },
    composer: {
      backgroundColor: c.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      paddingHorizontal: 10,
      paddingTop: 8,
    },
    pendingFile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      marginBottom: 6,
      borderRadius: 10,
      backgroundColor: c.accentLight,
    },
    pendingName: {
      flex: 1,
      fontSize: 13,
      color: c.accent,
    },
    pendingThumb: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: c.surfaceAlt,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 6,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 40,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 15,
      color: c.text,
      backgroundColor: c.input,
      borderWidth: 1,
      borderColor: c.borderStrong,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.red,
      alignItems: "center",
      justifyContent: "center",
    },
    sendDisabled: {
      opacity: 0.45,
    },
    flexNone: {
      flex: 0,
    },
    readOnly: {
      textAlign: "center",
      fontSize: 13,
      color: c.textSub,
      paddingTop: 10,
      backgroundColor: c.surface,
    },
  });
