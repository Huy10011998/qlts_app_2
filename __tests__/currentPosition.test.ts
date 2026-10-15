const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();

jest.mock("@react-native-community/geolocation", () => ({
  __esModule: true,
  default: {
    watchPosition: (...args: unknown[]) => mockWatchPosition(...args),
    clearWatch: (...args: unknown[]) => mockClearWatch(...args),
    getCurrentPosition: jest.fn(),
    requestAuthorization: jest.fn(),
    setRNConfiguration: jest.fn(),
  },
}));

import { PermissionsAndroid, Platform } from "react-native";

import { getCurrentCoordinates } from "../src/utils/location/currentPosition";

const fix = { coords: { latitude: 10.8274371, longitude: 106.5927432, accuracy: 18 } };

describe("getCurrentCoordinates (Android, dịch vụ vị trí Google)", () => {
  beforeAll(() => {
    Platform.OS = "android";
  });
  afterAll(() => {
    Platform.OS = "ios";
  });
  beforeEach(() => {
    mockWatchPosition.mockReset().mockReturnValue(1000);
    mockClearWatch.mockReset();
    jest
      .spyOn(PermissionsAndroid, "requestMultiple")
      .mockResolvedValue({
        "android.permission.ACCESS_FINE_LOCATION": "granted",
        "android.permission.ACCESS_COARSE_LOCATION": "granted",
      } as any);
  });

  it("bỏ qua báo tạm 'chưa có vị trí', lấy toạ độ thật đầu tiên rồi thôi theo dõi", async () => {
    mockWatchPosition.mockImplementation((success, error) => {
      setTimeout(() => error({ code: 2, message: "Location not available" }), 0);
      setTimeout(() => success(fix), 5);
      return 1000;
    });
    await expect(getCurrentCoordinates()).resolves.toEqual({
      lat: "10.827437",
      lng: "106.592743",
      accuracy: 18,
    });
    expect(mockClearWatch).toHaveBeenCalledWith(1000);
  });

  it("bị từ chối quyền giữa chừng → null ngay", async () => {
    mockWatchPosition.mockImplementation((_success, error) => {
      setTimeout(() => error({ code: 1, message: "denied" }), 0);
      return 1000;
    });
    await expect(getCurrentCoordinates()).resolves.toBeNull();
    expect(mockClearWatch).toHaveBeenCalledWith(1000);
  });

  it("chỉ cấp vị trí gần đúng (COARSE) vẫn lấy toạ độ", async () => {
    (PermissionsAndroid.requestMultiple as jest.Mock).mockResolvedValue({
      "android.permission.ACCESS_FINE_LOCATION": "denied",
      "android.permission.ACCESS_COARSE_LOCATION": "granted",
    });
    mockWatchPosition.mockImplementation((success) => {
      setTimeout(() => success(fix), 0);
      return 1000;
    });
    await expect(getCurrentCoordinates()).resolves.not.toBeNull();
  });
});
