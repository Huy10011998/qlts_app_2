import React from "react";
import ReactTestRenderer from "react-test-renderer";

import { useOpenCameraZone } from "../src/screens/Camera/shared/useOpenCameraZone";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// Khu vực 1 có con là khu vực 2; mỗi khu vực một camera. Dòng thiếu iD_Camera là
// bản ghi khu vực thuần, không phải camera.
const RAW_DATA = [
  { iD_VungCamera: 1, iD_VungCameraParent: null },
  { iD_VungCamera: 2, iD_VungCameraParent: 1 },
  {
    iD_VungCamera: 1,
    iD_Camera: 10,
    iD_Camera_Ma: "CAM10",
    iD_Camera_MoTa: "Cổng chính",
  },
  {
    iD_VungCamera: 2,
    iD_Camera: 20,
    iD_Camera_Ma: "CAM20",
    iD_Camera_MoTa: "Kho lạnh",
  },
  { iD_VungCamera: 9, iD_Camera: 90, iD_Camera_Ma: "CAM90" },
  { iD_VungCamera: 1, iD_Camera: null, iD_Camera_Ma: null },
];

const mount = async (onOpened?: (target: any) => void) => {
  let open: ReturnType<typeof useOpenCameraZone>;

  function Harness() {
    open = useOpenCameraZone(RAW_DATA, onOpened);
    return null;
  }

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Harness />);
  });

  return open!;
};

beforeEach(() => jest.clearAllMocks());

describe("mở khu vực camera", () => {
  it("gom cả camera của khu vực con", async () => {
    const open = await mount();

    await ReactTestRenderer.act(async () => {
      open({ id: "1", label: "Nhà máy" });
    });

    expect(mockNavigate).toHaveBeenCalledWith("CameraList", {
      zoneId: 1,
      zoneName: "Nhà máy",
      cameras: [
        { iD_Camera: 10, iD_Camera_Ma: "CAM10", iD_Camera_MoTa: "Cổng chính" },
        { iD_Camera: 20, iD_Camera_Ma: "CAM20", iD_Camera_MoTa: "Kho lạnh" },
      ],
    });
  });

  it("không lấy camera của khu vực khác nhánh", async () => {
    const open = await mount();

    await ReactTestRenderer.act(async () => {
      open({ id: "2", label: "Kho" });
    });

    const { cameras } = mockNavigate.mock.calls[0][1];

    expect(cameras.map((camera: any) => camera.iD_Camera)).toEqual([20]);
  });

  // Ghi lại để hàng Truy cập nhanh mở lại đúng khu vực đó.
  it("báo lại khu vực vừa mở", async () => {
    const onOpened = jest.fn();
    const open = await mount(onOpened);

    await ReactTestRenderer.act(async () => {
      open({ id: "1", label: "Nhà máy" });
    });

    expect(onOpened).toHaveBeenCalledWith({ id: "1", label: "Nhà máy" });
  });
});
