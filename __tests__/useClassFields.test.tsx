import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { getFieldActive } from "../src/services/data/commonApi";
import { useClassFields } from "../src/screens/Workflow/shared/workflowMetadata";

jest.mock("../src/services/data/commonApi", () => ({
  getFieldActive: jest.fn(),
}));

const mockGetFieldActive = getFieldActive as jest.Mock;

// Mỗi lượt vẽ ghi lại trạng thái, để biết khung ĐẦU TIÊN đã có field chưa.
const renders: { names: string[]; ready: boolean }[] = [];

function Probe({ nameClass }: { nameClass: string }) {
  const { fields, ready } = useClassFields(nameClass);
  renders.push({ names: fields.map((field) => field.name), ready });
  return null;
}

const mount = async (nameClass: string) => {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<Probe nameClass={nameClass} />);
  });
  return tree!;
};

beforeEach(() => {
  renders.length = 0;
  mockGetFieldActive.mockReset();
});

// Màn danh sách / chi tiết Công việc, Kế hoạch giữ khung chờ tới khi `ready` —
// không thì thẻ vẽ trống số, tiêu đề, các dòng rồi mới hiện thông tin.
describe("useClassFields", () => {
  it("lần đầu chưa ready, field về thì ready kèm field", async () => {
    mockGetFieldActive.mockResolvedValue({ data: [{ name: "SoCongViec" }] });
    const tree = await mount("CV_Test_A");

    expect(renders[0]).toEqual({ names: [], ready: false });
    expect(renders[renders.length - 1]).toEqual({ names: ["SoCongViec"], ready: true });
    tree.unmount();
  });

  it("mở lại trong phiên: có field ngay khung đầu, không gọi lại API", async () => {
    mockGetFieldActive.mockResolvedValue({ data: [{ name: "TieuDe" }] });
    (await mount("CV_Test_B")).unmount();
    renders.length = 0;

    (await mount("CV_Test_B")).unmount();

    expect(renders[0]).toEqual({ names: ["TieuDe"], ready: true });
    expect(mockGetFieldActive).toHaveBeenCalledTimes(1);
  });

  it("lỗi metadata vẫn ready (rỗng) để màn không kẹt khung chờ", async () => {
    mockGetFieldActive.mockRejectedValue(new Error("mất mạng"));
    const tree = await mount("CV_Test_C");

    expect(renders[renders.length - 1]).toEqual({ names: [], ready: true });
    tree.unmount();
  });
});
