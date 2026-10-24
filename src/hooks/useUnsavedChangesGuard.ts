import { useCallback, useRef } from "react";
import { AppAlert } from "../components/ui/AppAlert";
import { useNavigation, usePreventRemove } from "@react-navigation/native";

type UnsavedChangesGuardOptions = {
  /** Nội dung hộp thoại; mặc định nói chung chung về thay đổi chưa lưu. */
  message?: string;
};

const DEFAULT_MESSAGE =
  "Bạn có thay đổi chưa lưu. Rời màn này thì những gì vừa nhập sẽ mất.";

/**
 * Hỏi "Bỏ thay đổi?" khi người dùng rời một form đang nhập dở — bấm back, vuốt
 * back (iOS), hay nút quay lại phần cứng (Android) đều đi qua đây.
 *
 * Dùng `usePreventRemove` chứ không tự nghe `beforeRemove`: native-stack chỉ khoá
 * được cử chỉ vuốt back qua hook này.
 *
 * Lưu xong mà muốn rời màn thì gọi `leaveWithoutPrompt(() => navigation.goBack())`
 * — form lúc đó vẫn đang "dirty" theo state, nên không bỏ chặn thì chính lượt
 * goBack sau khi lưu cũng bị hỏi lại.
 */
export function useUnsavedChangesGuard(
  isDirty: boolean,
  options: UnsavedChangesGuardOptions = {},
) {
  const navigation = useNavigation();
  // Ref chứ không state: đọc ngay tại lúc chặn, không phải đợi một lượt render
  // mới để bỏ chặn.
  const bypassRef = useRef(false);
  const { message = DEFAULT_MESSAGE } = options;

  usePreventRemove(isDirty, ({ data }) => {
    if (bypassRef.current) {
      navigation.dispatch(data.action);
      return;
    }

    AppAlert.alert("Bỏ thay đổi?", message, [
      { text: "Ở lại", style: "cancel" },
      {
        text: "Bỏ thay đổi",
        style: "destructive",
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  const leaveWithoutPrompt = useCallback((leave: () => void) => {
    bypassRef.current = true;
    leave();
  }, []);

  return { leaveWithoutPrompt };
}
