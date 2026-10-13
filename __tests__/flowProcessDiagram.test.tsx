import React from "react";
import { Text } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import FlowProcessDetail from "../src/screens/Workflow/Flow/components/FlowProcessDetail";
import FlowProcessDiagram from "../src/screens/Workflow/Flow/components/FlowProcessDiagram";
import {
  buildFlowDiagram,
  getFlowPointDetail,
  getInitialFlowPoint,
} from "../src/screens/Workflow/Flow/flowProcessRules";
import type { FlowTienTrinh } from "../src/types/index";

// Dựng thử sơ đồ + khung chi tiết với một phiếu trả bước 1 lần: bắt lỗi lúc
// render (toạ độ, hook) mà không cần mở simulator.
const data: FlowTienTrinh = {
  buocs: [
    { id: 1, buoc: 1, buocCon: null, ten: "Trưởng bộ phận duyệt", tinhTrang: 2 },
    { id: 2, buoc: 2, buocCon: null, ten: "Kiểm soát chứng từ", tinhTrang: 0, loaiXuLy: 0 },
    { id: 21, buoc: 2, buocCon: 1, ten: "Kế toán viên", tinhTrang: 1, ngayMo: "2026-10-12T16:20:00" },
    { id: 22, buoc: 2, buocCon: 2, ten: "Kế toán trưởng", tinhTrang: 0 },
    { id: 3, buoc: 3, buocCon: null, ten: "Giám đốc duyệt", tinhTrang: 0 },
  ],
  nguoiDuyets: [
    { iD_Flow_HoSo_Buoc: 1, iD_NhanVien_MoTa: "TEST02 - Nhân viên Test 2", ketQua: 1, ngayDuyet: "2026-10-12T16:19:00" },
    { iD_Flow_HoSo_Buoc: 21, iD_NhanVien_MoTa: "TEST03 - Nhân viên Test 3", ketQua: null },
  ],
  luatNguois: [{ iD_Flow_HoSo_Buoc: 3, iD_NhanVien_MoTa: "Nhân viên Test 1" }],
  congViec: null,
  traBuocs: [
    {
      lan: 1,
      iD_Flow_HoSo_Buoc_Tu: 21,
      iD_Flow_HoSo_Buoc_Ve: 1,
      tenBuocTu: "2.1. Kế toán viên",
      tenBuocVe: "1. Trưởng bộ phận duyệt",
      iD_NhanVien_MoTa: "TEST03 - Nhân viên Test 3",
      lyDo: "Thiếu chữ ký.",
      ngayTra: "2026-10-12T16:18:00",
    },
  ],
  nguoiDuyetCus: [
    { iD_Flow_HoSo_Buoc: 21, iD_NhanVien_MoTa: "TEST03 - Nhân viên Test 3", ketQua: 4, ngayDuyet: "2026-10-12T16:18:00", lan: 1 },
  ],
};

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAllByType(Text).map((node) => {
    const children = ([] as unknown[]).concat(node.props.children);
    return children.filter((child) => typeof child === "string" || typeof child === "number").join("");
  });

describe("FlowProcessDiagram / FlowProcessDetail", () => {
  it("vẽ 2 lượt, nhãn Lần, nhãn trả bước và khung chi tiết của điểm đang xử lý", async () => {
    const diagram = buildFlowDiagram(data, "2026-10-04T16:19:00");
    const selected = getInitialFlowPoint(diagram)!;
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    // ThemeProvider đọc cài đặt giao diện xong mới dựng con.
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <FlowProcessDiagram diagram={diagram} selectedKey={selected.key} onSelect={jest.fn()} />
          <FlowProcessDetail
            point={selected}
            detail={getFlowPointDetail(data, selected, diagram)}
            onOpenCongViec={jest.fn()}
          />
        </ThemeProvider>,
      );
    });

    const texts = textsOf(renderer);
    expect(texts).toEqual(expect.arrayContaining(["Lần 1", "Lần 2", "Lập phiếu", "ĐANG Ở BƯỚC"]));
    expect(texts.some((text) => text.startsWith("Trả bước lần 1"))).toBe(true);
    // Bước chưa mở: người khai trong luatNguois.
    expect(texts).toContain("2. Kiểm soát chứng từ");
  });

  it("điểm bấm trả ở lượt cũ có khung lý do", async () => {
    const diagram = buildFlowDiagram(data, null);
    const tra = diagram.runs[0].points.find((point) => point.state === "tra")!;
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ThemeProvider>
          <FlowProcessDetail point={tra} detail={getFlowPointDetail(data, tra, diagram)} onOpenCongViec={jest.fn()} />
        </ThemeProvider>,
      );
    });

    const texts = textsOf(renderer);
    expect(texts).toContain("LẦN 1 · BƯỚC");
    expect(texts).toContain("Lý do: Thiếu chữ ký.");
  });
});
