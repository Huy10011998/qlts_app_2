import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { getPropertyClass } from "../src/services/data/commonApi";
import { getFlowFields } from "../src/services/data/flowApi";
import { getWorkflowMe } from "../src/services/data/workflowApi";
import { useFlowMeta } from "../src/screens/Workflow/Flow/useFlowMeta";
import { useWorkflowMe } from "../src/screens/Workflow/shared/useWorkflowMe";

jest.mock("../src/services/data/commonApi", () => ({ getPropertyClass: jest.fn() }));
jest.mock("../src/services/data/flowApi", () => ({ getFlowFields: jest.fn() }));
jest.mock("../src/services/data/workflowApi", () => ({
  getWorkflowMe: jest.fn(),
  isWorkflowNotFound: () => false,
}));
jest.mock("../src/context/AuthContext", () => ({ useAuth: () => ({ token: "tok" }) }));
jest.mock("../src/hooks/useNhanVienInfo", () => ({
  useNhanVienInfo: () => ({ info: null, isLoading: false }),
}));

// Mở lại màn trong phiên: dữ liệu đã về phải có ngay ở khung đầu, không thì màn
// chi tiết phiếu / bình luận có một khung thiếu số phiếu, nút duyệt, bên tin nhắn.
const renders: unknown[] = [];

const mount = async (element: React.ReactElement) => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  tree!.unmount();
};

beforeEach(() => {
  renders.length = 0;
});

it("useFlowMeta: lần sau có metadata ngay khung đầu", async () => {
  (getFlowFields as jest.Mock).mockResolvedValue({ flow: { id: 1, ten: "Ticket" }, fields: [] });
  (getPropertyClass as jest.Mock).mockResolvedValue({ data: { propertyTuDongTang: "SoTicket" } });

  function Probe() {
    const { meta, loading } = useFlowMeta("Ticket_Test");
    renders.push({ so: meta?.soPhieuField ?? null, loading });
    return null;
  }

  await mount(<Probe />);
  expect(renders[0]).toEqual({ so: null, loading: true });

  renders.length = 0;
  await mount(<Probe />);
  expect(renders[0]).toEqual({ so: "SoTicket", loading: false });
  expect(getFlowFields).toHaveBeenCalledTimes(1);
});

it("useWorkflowMe: lần sau biết ngay nhân viên đăng nhập", async () => {
  (getWorkflowMe as jest.Mock).mockResolvedValue({ iD_NhanVien: 9 });

  function Probe() {
    const { me, loading } = useWorkflowMe();
    renders.push({ id: me.iD_NhanVien, loading });
    return null;
  }

  await mount(<Probe />);
  expect(renders[0]).toEqual({ id: null, loading: true });

  renders.length = 0;
  await mount(<Probe />);
  expect(renders[0]).toEqual({ id: 9, loading: false });
  expect(getWorkflowMe).toHaveBeenCalledTimes(1);
});
