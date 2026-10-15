import {
  formatEnergy,
  formatEnergyCompact,
  formatPercent,
  formatPower,
} from "../src/screens/Home/SolarPlantScreen.helpers";

// Ô tổng tích luỹ theo kiểu app FusionSolar: 3 chữ số có nghĩa, tự lên đơn vị.
describe("formatEnergyCompact", () => {
  it("giữ 3 chữ số có nghĩa và bỏ số 0 thừa", () => {
    expect(formatEnergyCompact(22_040_000)).toEqual({ value: "22", unit: "MWh" });
    expect(formatEnergyCompact(842_590_000)).toEqual({ value: "843", unit: "MWh" });
    expect(formatEnergyCompact(2_500_000)).toEqual({ value: "2.5", unit: "MWh" });
  });

  it("lên GWh khi tới 1.000 MWh", () => {
    expect(formatEnergyCompact(1_028_730_000)).toEqual({ value: "1.03", unit: "GWh" });
  });

  it("làm tròn chạm 1.000 thì lên hẳn đơn vị kế", () => {
    expect(formatEnergyCompact(999_600_000)).toEqual({ value: "1", unit: "GWh" });
  });

  it("số nhỏ xuống kWh, Wh", () => {
    expect(formatEnergyCompact(112_000)).toEqual({ value: "112", unit: "kWh" });
    expect(formatEnergyCompact(112)).toEqual({ value: "112", unit: "Wh" });
    expect(formatEnergyCompact(0)).toEqual({ value: "0", unit: "Wh" });
  });

  it("không có số thì hiện gạch", () => {
    expect(formatEnergyCompact(null).unit).toBe("");
  });
});

describe("làm tròn nửa lên", () => {
  // 9350 W: toFixed(1) trên 9.35 ra "9.3" vì sai số nhị phân, app FusionSolar ra 9.4.
  it("9350 W ra 9.4 kW như app nhà cung cấp", () => {
    expect(formatPower(9_350)).toEqual({ value: "9.4", unit: "kW" });
    expect(formatPower(1_005)).toEqual({ value: "1.0", unit: "kW" });
    expect(formatPower(1_050)).toEqual({ value: "1.1", unit: "kW" });
  });

  it("áp dụng cho cả điện năng và phần trăm", () => {
    expect(formatEnergy(1_065_000)).toEqual({ value: "1.07", unit: "MWh" });
    expect(formatPercent(14.5)).toBe("15%");
  });
});
