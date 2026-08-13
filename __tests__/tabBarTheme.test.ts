import {
  HUMP_HALF_WIDTH,
  HUMP_RISE,
  SCAN_BUTTON_RISE,
  SCAN_BUTTON_SIZE,
  TAB_HEIGHT,
} from "../src/navigation/shared/tabBarTheme";

describe("hình học mu cong ở mép thanh tab", () => {
  it("vòng tròn Quét QR nằm gọn trong mu cong", () => {
    // Mu nhô cao hơn vòng tròn để còn thấy nền phía trên nó.
    expect(HUMP_RISE).toBeGreaterThan(SCAN_BUTTON_RISE);
    // Và trải rộng hơn vòng tròn về hai bên.
    expect(HUMP_HALF_WIDTH * 2).toBeGreaterThan(SCAN_BUTTON_SIZE);
  });

  it("mu trải đủ rộng để đường cong còn thoải", () => {
    // Nhô cao mà hẹp thì thành cái gai; giữ tỉ lệ rộng/cao tối thiểu 2:1.
    expect(HUMP_HALF_WIDTH / HUMP_RISE).toBeGreaterThanOrEqual(2);
  });

  it("phần nhô nhỏ so với thanh tab", () => {
    // Phần nhô vẽ tràn ra ngoài thanh tab và trên Android không nhận touch, nên
    // phải nhỏ hơn nhiều so với phần nút nằm trong thanh tab.
    expect(SCAN_BUTTON_RISE).toBeLessThan(TAB_HEIGHT / 4);
  });
});
