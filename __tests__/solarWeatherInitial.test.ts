import {
  getInitialPlantWeather,
  guessPlantIsDay,
} from "../src/screens/Home/SolarPlantScreen.helpers";

/** Giờ Việt Nam (UTC+7) → Date. */
const vnTime = (hour: number, minute = 0) =>
  new Date(Date.UTC(2026, 9, 29, hour - 7, minute));

describe("thời tiết ban đầu của hero Điện mặt trời", () => {
  it("đoán ngày / đêm theo giờ Việt Nam, không theo múi giờ của máy", () => {
    expect(guessPlantIsDay(vnTime(5, 59))).toBe(false);
    expect(guessPlantIsDay(vnTime(6, 0))).toBe(true);
    expect(guessPlantIsDay(vnTime(12, 0))).toBe(true);
    expect(guessPlantIsDay(vnTime(17, 59))).toBe(true);
    expect(guessPlantIsDay(vnTime(18, 0))).toBe(false);
    expect(guessPlantIsDay(vnTime(22, 9))).toBe(false);
  });

  it("chưa có lần đọc nào thì vẽ theo phỏng đoán, không mặc định ban ngày", () => {
    const night = getInitialPlantWeather(vnTime(22, 9).getTime());

    expect(night).toMatchObject({ isDay: false, isLoading: true });
    expect(night.temperature).toBeNull();
    expect(getInitialPlantWeather(vnTime(9, 0).getTime()).isDay).toBe(true);
  });
});
