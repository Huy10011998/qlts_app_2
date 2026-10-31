import { useCallback, useRef } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { useAutoReload } from "../../../hooks/useAutoReload";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { markWorkflowChanged } from "../../../store/WorkflowSlice";

/** Báo đã có thay đổi dữ liệu Workflow — các màn đang giữ dữ liệu cũ sẽ nạp lại. */
export const useMarkWorkflowChanged = () => {
  const dispatch = useAppDispatch();
  return useCallback(() => dispatch(markWorkflowChanged()), [dispatch]);
};

/**
 * Gọi `reload` khi màn được focus lại mà `version` đã đổi so với lần nạp
 * trước. Lần focus đầu tiên không gọi — màn tự nạp lúc mount.
 *
 * Cả khi app vừa từ nền về / vừa có mạng lại: BE hay người khác có thể đã đổi
 * dữ liệu (thêm mình vào phiếu, giao việc) mà `version` không biết. Màn đang
 * hiện thì nạp ngay; màn nằm dưới stack thì nạp lúc quay về.
 */
export const useReloadOnWorkflowChange = (reload: () => void) => {
  const navigation = useNavigation();
  const version = useAppSelector((state) => state.workflow.version);
  const seenRef = useRef(version);
  const staleRef = useRef(false);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useAutoReload(() => {
    if (navigation.isFocused()) reloadRef.current();
    else staleRef.current = true;
  });

  useFocusEffect(
    useCallback(() => {
      if (seenRef.current === version && !staleRef.current) return;

      seenRef.current = version;
      staleRef.current = false;
      reloadRef.current();
    }, [version]),
  );
};
