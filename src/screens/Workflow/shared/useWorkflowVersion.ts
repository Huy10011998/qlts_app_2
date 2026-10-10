import { useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";

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
 */
export const useReloadOnWorkflowChange = (reload: () => void) => {
  const version = useAppSelector((state) => state.workflow.version);
  const seenRef = useRef(version);
  const reloadRef = useRef(reload);
  reloadRef.current = reload;

  useFocusEffect(
    useCallback(() => {
      if (seenRef.current === version) return;

      seenRef.current = version;
      reloadRef.current();
    }, [version]),
  );
};
