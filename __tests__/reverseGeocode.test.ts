jest.mock("../src/services/data/httpClient", () => ({ callApi: jest.fn() }));

import { callApi } from "../src/services/data/httpClient";
import { cleanAddress, reverseGeocode } from "../src/utils/location/reverseGeocode";

const callApiMock = callApi as jest.Mock;

describe("reverseGeocode (9-Mobile-DiaChiTuToaDo)", () => {
  beforeEach(() => callApiMock.mockReset());

  it("gửi Lat/Lng dạng số, trả diaChi đã bỏ ', Việt Nam'", async () => {
    callApiMock.mockResolvedValue({
      message: "",
      data: { lat: 10.7769, lng: 106.7009, diaChi: "114 Nguyễn Huệ, Phường Sài Gòn, TP.HCM, Việt Nam" },
    });
    await expect(reverseGeocode("10.7769", "106.7009")).resolves.toBe(
      "114 Nguyễn Huệ, Phường Sài Gòn, TP.HCM",
    );
    expect(callApiMock.mock.calls[0][2]).toEqual({ Lat: 10.7769, Lng: 106.7009 });
  });

  it("BE không tra được / lỗi mạng → null, không ném", async () => {
    callApiMock.mockResolvedValue({ message: "Không tra được địa chỉ cho toạ độ này", data: { diaChi: null } });
    await expect(reverseGeocode(10.8, 106.5)).resolves.toBeNull();
    callApiMock.mockRejectedValue(new Error("Network Error"));
    await expect(reverseGeocode(10.8, 106.5)).resolves.toBeNull();
  });

  it("0,0 (GPS chưa bắt) hoặc toạ độ sai → null, không gọi BE", async () => {
    await expect(reverseGeocode(0, 0)).resolves.toBeNull();
    await expect(reverseGeocode("abc", "106.5")).resolves.toBeNull();
    expect(callApiMock).not.toHaveBeenCalled();
  });

  it("cleanAddress", () => {
    expect(cleanAddress("Bà Điểm, Hồ Chí Minh, Vietnam")).toBe("Bà Điểm, Hồ Chí Minh");
    expect(cleanAddress("  ")).toBeNull();
    expect(cleanAddress(null)).toBeNull();
  });
});
