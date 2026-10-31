import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  AUTH_USERNAME_KEY,
  readStoredLoginProfile,
} from "../src/context/authStorage";
// jest.mock bên dưới được babel-jest đẩy lên trên các import này.
import { loadNhanVienInfo } from "../src/store/NhanVienActions";

const mockCallApi = jest.fn();

jest.mock("../src/services/data/callApi", () => ({
  callApi: (...args: unknown[]) => mockCallApi(...args),
  isAuthExpiredError: () => false,
}));

/* Nạp danh thiếp xong thì lưu họ tên + ảnh cho màn Đăng nhập lần sau chào
   bằng tên (kiểu VCB). */
const runLoad = async () => {
  const dispatch = jest.fn();
  const getState = () => ({ nhanVien: { status: "idle" } }) as any;
  await loadNhanVienInfo()(dispatch, getState);
  // Lưu chạy nền sau khi thunk trả về.
  await new Promise((resolve) => setImmediate(resolve));
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockCallApi.mockReset();
});

describe("loadNhanVienInfo – nhớ họ tên cho màn Đăng nhập", () => {
  it("lưu họ tên + ảnh kèm tên đăng nhập đang nhớ", async () => {
    await AsyncStorage.setItem(AUTH_USERNAME_KEY, "nguyenvana");
    mockCallApi.mockResolvedValue({
      data: { ten: " Nguyễn Văn An ", hinhAnh: "data:image/png;base64,AAA" },
    });

    await runLoad();

    expect(await readStoredLoginProfile()).toEqual({
      userName: "nguyenvana",
      name: "Nguyễn Văn An",
      avatar: "data:image/png;base64,AAA",
    });
  });

  it("không có họ tên thì không lưu", async () => {
    await AsyncStorage.setItem(AUTH_USERNAME_KEY, "nguyenvana");
    mockCallApi.mockResolvedValue({ data: { ten: "  ", hinhAnh: null } });

    await runLoad();

    expect(await readStoredLoginProfile()).toBeNull();
  });
});
