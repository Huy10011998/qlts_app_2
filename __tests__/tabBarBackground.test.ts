import { buildTopEdge } from "../src/navigation/shared/TabBarBackground";
import { HUMP_RISE } from "../src/navigation/shared/tabBarTheme";

describe("mép trên thanh tab", () => {
  const numbers = (d: string) =>
    d.split(/[^\d.-]+/).filter(Boolean).map(Number);

  it("nối trơn giữa đoạn thẳng và mu cong", () => {
    // M 0 y  L x y  C c1 c2 apex  C c1 c2 end  L width y
    const [, y0, , yStart, , yGrip1, , yGrip2, , yApex] = numbers(
      buildTopEdge(390),
    );

    expect(y0).toBe(HUMP_RISE);
    expect(yStart).toBe(HUMP_RISE);
    // Điểm điều khiển đầu ngang với chỗ nối và điểm cuối ngang với đỉnh: có vậy
    // tiếp tuyến mới khớp, đường cong không gãy khúc ở hai đầu mu.
    expect(yGrip1).toBe(HUMP_RISE);
    // Đỉnh mu ở y = 0: gốc toạ độ của nền nằm cao hơn thanh tab đúng HUMP_RISE.
    expect(yApex).toBe(0);
    expect(yGrip2).toBe(yApex);
  });

  it("mu cong nằm giữa thanh tab", () => {
    const values = numbers(buildTopEdge(390));
    const apexX = values[8];

    expect(apexX).toBe(195);
  });
});
