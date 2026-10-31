import {
  TAB_BAR_SIDE_MARGIN,
  TAB_HEIGHT,
  createTabBarStyle,
  getTabBarBottomOffset,
} from "../src/navigation/shared/tabBarTheme";

describe("thanh tab nổi", () => {
  it("nằm đè lên nội dung, cách hai mép và không đổ bóng ở khung ngoài", () => {
    const style = createTabBarStyle({ bottomInset: 34 });

    expect(style.position).toBe("absolute");
    expect(style.start).toBe(TAB_BAR_SIDE_MARGIN);
    expect(style.end).toBe(TAB_BAR_SIDE_MARGIN);
    expect(style.height).toBe(TAB_HEIGHT);
    // Bóng ở `TabBarBackground`: elevation trên view trong suốt ra bóng vuông
    // trên Android.
    expect(style.elevation).toBe(0);
  });

  it("ngồi lấn xuống thanh vuốt nhưng không dính mép đáy", () => {
    // iPhone có thanh vuốt.
    expect(getTabBarBottomOffset(34, "ios")).toBe(22);
    // Máy không có safe area đáy vẫn chừa khoảng hở.
    expect(getTabBarBottomOffset(0, "ios")).toBe(12);
  });

  it("Android không lấn xuống thanh điều hướng / taskbar", () => {
    // Taskbar tablet Samsung, ba nút: viên nằm trên hẳn, hở thêm 8.
    expect(getTabBarBottomOffset(48, "android")).toBe(56);
    // Thanh vuốt mảnh.
    expect(getTabBarBottomOffset(16, "android")).toBe(24);
    // Android 14 trở xuống không tràn viền: safe area đáy 0.
    expect(getTabBarBottomOffset(0, "android")).toBe(12);
  });
});
