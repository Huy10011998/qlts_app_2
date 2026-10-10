import { createSlice } from "@reduxjs/toolkit";

/**
 * Bộ đếm thay đổi của view Workflow. Mỗi thao tác ghi (lưu, chuyển trạng thái,
 * gia hạn, duyệt, xoá...) tăng `version`; danh sách, lịch và chi tiết kế hoạch
 * nhớ version lúc nạp, quay lại màn mà version đã khác thì nạp lại.
 *
 * Dùng một bộ đếm chung thay cho cờ từng màn: một thao tác ở màn công việc làm
 * đổi cả lịch, danh sách kế hoạch (% hoàn thành) lẫn phiếu đề nghị đã sinh ra
 * việc đó.
 */
type WorkflowState = {
  version: number;
};

const initialState: WorkflowState = {
  version: 0,
};

const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    markWorkflowChanged(state) {
      state.version += 1;
    },
  },
});

export const { markWorkflowChanged } = workflowSlice.actions;
export default workflowSlice.reducer;
