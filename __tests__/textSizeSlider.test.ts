import {
  offsetForStep,
  stepFromTouch,
  usableTrackWidth,
} from "../src/components/ui/TextSizeSlider";
import { TEXT_SCALE_STEPS } from "../src/utils/helpers/textScaling";

const STEPS = TEXT_SCALE_STEPS.length;
const WIDTH = 270; // bề ngang thanh trượt trên máy cỡ phổ thông
const THUMB = 30;

describe("stepFromTouch", () => {
  it("chạm sát mép trái ra nấc đầu, sát mép phải ra nấc cuối", () => {
    expect(stepFromTouch(0, WIDTH, STEPS)).toBe(0);
    expect(stepFromTouch(WIDTH, WIDTH, STEPS)).toBe(STEPS - 1);
  });

  it("kẹp điểm chạm ra ngoài thanh thay vì trả nấc âm hay vượt", () => {
    expect(stepFromTouch(-200, WIDTH, STEPS)).toBe(0);
    expect(stepFromTouch(WIDTH + 200, WIDTH, STEPS)).toBe(STEPS - 1);
  });

  it("chạm đúng giữa ra nấc giữa", () => {
    expect(stepFromTouch(WIDTH / 2, WIDTH, STEPS)).toBe((STEPS - 1) / 2);
  });

  it("chạm đúng tâm mỗi nấc trả về chính nấc đó", () => {
    // Vòng khép kín: đặt thumb ở nấc n rồi chạm vào tâm nó phải ra lại n. Lệch
    // một nấc ở đây là kéo thanh trượt sẽ thấy nhảy sai.
    for (let step = 0; step < STEPS; step += 1) {
      const centerX = offsetForStep(step, WIDTH, STEPS) + THUMB / 2;

      expect(stepFromTouch(centerX, WIDTH, STEPS)).toBe(step);
    }
  });

  it("không chia cho 0 khi chưa đo được bề ngang", () => {
    expect(stepFromTouch(10, 0, STEPS)).toBe(0);
    expect(Number.isNaN(stepFromTouch(10, THUMB, STEPS))).toBe(false);
  });
});

describe("offsetForStep", () => {
  it("nấc đầu sát mép trái, nấc cuối sát mép phải", () => {
    expect(offsetForStep(0, WIDTH, STEPS)).toBe(0);
    expect(offsetForStep(STEPS - 1, WIDTH, STEPS)).toBe(WIDTH - THUMB);
  });

  it("thumb không bao giờ tràn khỏi thanh", () => {
    for (let step = 0; step < STEPS; step += 1) {
      const left = offsetForStep(step, WIDTH, STEPS);

      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + THUMB).toBeLessThanOrEqual(WIDTH);
    }
  });

  it("khoảng cách giữa các nấc đều nhau", () => {
    const gaps = Array.from({ length: STEPS - 1 }, (_, index) =>
      offsetForStep(index + 1, WIDTH, STEPS) - offsetForStep(index, WIDTH, STEPS)
    );

    gaps.forEach((gap) => expect(gap).toBeCloseTo(gaps[0]));
  });
});

describe("usableTrackWidth", () => {
  it("không âm khi thanh hẹp hơn thumb", () => {
    expect(usableTrackWidth(10)).toBe(0);
    expect(usableTrackWidth(0)).toBe(0);
  });
});
