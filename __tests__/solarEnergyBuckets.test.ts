import {
  buildEnergyBarChart,
  mapEnergyDetails,
} from "../src/screens/Home/SolarPlantScreen.helpers";

// Ở kỳ Tuần/Tháng/Năm biểu đồ vẽ từ chuỗi của `dashboard-energy-details`, không
// phải từ `power-details` (chỉ có dữ liệu của đúng 1 ngày). Các test dưới đây
// khoá lại đúng phần đọc chuỗi đó: đơn vị của API, mốc bị thiếu ở một số meter,
// và mốc mới nhất còn số liệu.

const details = (
  unit: string,
  meters: { type: string; values: { date: string; value: number | null }[] }[],
) => ({ energyDetails: { timeUnit: "DAY", unit, meters } });

describe("mapEnergyDetails - chuỗi theo mốc", () => {
  it("quy đổi theo đơn vị API và gộp mốc của mọi meter", () => {
    const view = mapEnergyDetails(
      details("kWh", [
        {
          type: "Production",
          values: [
            { date: "2026-08-01 00:00:00", value: 4000 },
            { date: "2026-08-02 00:00:00", value: 5000 },
          ],
        },
        {
          // Meter này thiếu mốc 1/8 và có thêm mốc 3/8 mà Production không có:
          // cả hai mốc đều phải xuất hiện.
          type: "Consumption",
          values: [
            { date: "2026-08-02 00:00:00", value: 19000 },
            { date: "2026-08-03 00:00:00", value: 7000 },
          ],
        },
        {
          type: "SelfConsumption",
          values: [{ date: "2026-08-02 00:00:00", value: 4400 }],
        },
      ]),
    );

    expect(view.buckets.map((bucket) => bucket.date?.getDate())).toEqual([
      1, 2, 3,
    ]);
    expect(view.buckets[0].production).toBe(4_000_000);
    // Mốc thiếu số ở meter đó thì bằng 0, không phải null: cột chỉ đơn giản là
    // không được vẽ.
    expect(view.buckets[0].consumption).toBe(0);
    expect(view.buckets[1].selfConsumption).toBe(4_400_000);
    // Mốc cuối còn số liệu là 3/8 (chỉ Consumption có số).
    expect(view.lastBucketIndex).toBe(2);
  });

  it("không có `values` thì chuỗi rỗng, tổng vẫn tính được", () => {
    const view = mapEnergyDetails(
      details("Wh", [{ type: "Production", values: [] }]),
    );

    expect(view.buckets).toEqual([]);
    expect(view.lastBucketIndex).toBe(-1);
  });
});

describe("buildEnergyBarChart", () => {
  const view = mapEnergyDetails(
    details("Wh", [
      {
        type: "Production",
        values: [
          { date: "2026-08-01 00:00:00", value: 4_000_000 },
          { date: "2026-08-02 00:00:00", value: 9_000_000 },
        ],
      },
      {
        type: "Consumption",
        values: [
          { date: "2026-08-01 00:00:00", value: 18_000_000 },
          { date: "2026-08-02 00:00:00", value: 19_000_000 },
        ],
      },
      {
        type: "SelfConsumption",
        values: [
          { date: "2026-08-01 00:00:00", value: 3_000_000 },
          { date: "2026-08-02 00:00:00", value: 4_000_000 },
        ],
      },
      {
        type: "FeedIn",
        values: [{ date: "2026-08-02 00:00:00", value: 5_000_000 }],
      },
      {
        type: "Purchased",
        values: [
          { date: "2026-08-01 00:00:00", value: 15_000_000 },
          { date: "2026-08-02 00:00:00", value: 15_000_000 },
        ],
      },
    ]),
  );

  it("kỳ gộp: 2 cột mỗi mốc, Tự dùng vẽ đè lên cột Tiêu thụ", () => {
    const chart = buildEnergyBarChart(view, "Week", "merged");

    expect(chart?.unitLabel).toBe("MWh");
    expect(chart?.buckets[0].label).toBe("1/8");
    expect(chart?.buckets[0].columns).toHaveLength(2);
    expect(chart?.buckets[0].columns[0].stack[0].value).toBe(4);
    expect(chart?.buckets[0].columns[1].stack[0].value).toBe(18);
    expect(chart?.buckets[0].columns[1].overlay?.value).toBe(3);
  });

  it("kỳ tách: một cột xếp tầng, cộng lại đúng bằng tổng của mốc", () => {
    const production = buildEnergyBarChart(view, "Month", "production");
    const consumption = buildEnergyBarChart(view, "Month", "consumption");

    // 2/8: tự dùng 4 + phát lên lưới 5 = sản xuất 9.
    expect(
      production?.buckets[1].columns[0].stack.map((part) => part.value),
    ).toEqual([4, 5]);
    // 2/8: từ mặt trời 4 + mua từ lưới 15 = tiêu thụ 19.
    expect(
      consumption?.buckets[1].columns[0].stack.map((part) => part.value),
    ).toEqual([4, 15]);
    // Kỳ Tháng chỉ ghi ngày trong tháng cho nhãn trục X.
    expect(production?.buckets[1].label).toBe("2");
  });

  it("tooltip lấy mốc mới nhất, đúng chuỗi của từng biểu đồ", () => {
    expect(buildEnergyBarChart(view, "Week", "merged")?.markerLabel).toBe(
      "02/08/2026",
    );
    expect(buildEnergyBarChart(view, "Week", "merged")?.markerValue).toBe(
      9_000_000,
    );
    expect(
      buildEnergyBarChart(view, "Week", "consumption")?.markerValue,
    ).toBe(19_000_000);
    expect(buildEnergyBarChart(view, "Year", "merged")?.markerLabel).toBe(
      "Tháng 8/2026",
    );
  });

  it("kỳ Năm ghi nhãn theo tháng", () => {
    expect(buildEnergyBarChart(view, "Year", "merged")?.buckets[0].label).toBe(
      "T8",
    );
  });

  it("chuỗi rỗng trả null để phía màn hình dựng khung chờ", () => {
    expect(buildEnergyBarChart(null, "Week", "merged")).toBeNull();
    expect(
      buildEnergyBarChart(
        mapEnergyDetails(details("Wh", [])),
        "Week",
        "merged",
      ),
    ).toBeNull();
  });

  it("giá trị nhỏ thì trục dùng kWh chứ không phải MWh", () => {
    const small = mapEnergyDetails(
      details("Wh", [
        {
          type: "Production",
          values: [{ date: "2026-08-01 00:00:00", value: 4_000 }],
        },
      ]),
    );

    expect(buildEnergyBarChart(small, "Week", "merged")?.unitLabel).toBe("kWh");
    expect(
      buildEnergyBarChart(small, "Week", "merged")?.buckets[0].columns[0]
        .stack[0].value,
    ).toBe(4);
  });
});
