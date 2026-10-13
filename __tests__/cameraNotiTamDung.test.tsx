import React from "react";
import ReactTestRenderer from "react-test-renderer";

const mockGet = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (effect: () => void) => require("react").useEffect(effect, [effect]),
}));
jest.mock("../src/services/notifications/cameraNotiApi", () => ({
  getTrangThaiNotiCamera: () => mockGet(),
  tamDungNotiCamera: jest.fn(),
  huyTamDungNotiCamera: jest.fn(),
}));
jest.mock("../src/utils/Logger", () => ({ warn: jest.fn() }));

import { useCameraNotiTamDung } from "../src/screens/Settings/shared/useCameraNotiTamDung";

type Hook = ReturnType<typeof useCameraNotiTamDung>;

// Vòng xoay kéo-để-làm-mới chỉ theo lượt người dùng kéo: lượt tải lúc vào màn
// chạy im lặng (bật refreshing bằng code làm iOS kẹt một khoảng trống).
describe("useCameraNotiTamDung", () => {
  const mount = async () => {
    const states: Hook[] = [];
    const Probe = () => {
      states.push(useCameraNotiTamDung());
      return null;
    };
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(<Probe />);
    });
    return { states, last: () => states[states.length - 1] };
  };

  beforeEach(() => mockGet.mockReset());

  it("tải lúc vào màn không bật vòng xoay kéo-để-làm-mới", async () => {
    mockGet.mockResolvedValue({ data: [] });
    const { states, last } = await mount();

    expect(states.some((state) => state.dangLamMoi)).toBe(false);
    expect(last().dangTai).toBe(false);
  });

  it("kéo để làm mới: tải lỗi thì báo lỗi, vòng xoay tắt lại", async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    const { last } = await mount();

    mockGet.mockRejectedValueOnce(new Error("mất mạng"));
    await ReactTestRenderer.act(async () => {
      await last().lamMoi();
    });

    expect(last().loi).toContain("Không đọc được trạng thái thông báo");
    expect(last().dangLamMoi).toBe(false);
  });
});
