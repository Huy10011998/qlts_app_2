import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import ReactTestRenderer from "react-test-renderer";
import {
  FontScaleProvider,
  useTextScale,
} from "../src/context/FontScaleContext";
import {
  getTextScaleFactor,
  getTextScaleFactorForStep,
  setTextScaleFactor,
  TEXT_SCALE_DEFAULT_STEP,
  TEXT_SCALE_STEPS,
} from "../src/utils/helpers/textScaling";

const STORAGE_KEY = "@qlts/text-scale-step";
const LAST_STEP = TEXT_SCALE_STEPS.length - 1;

type Probe = {
  step: number;
  factor: number;
  setStep: (step: number) => void;
};

function FontScaleProbe({ onRender }: { onRender: (probe: Probe) => void }) {
  onRender(useTextScale());

  return null;
}

async function mountProbe() {
  const renders: Probe[] = [];
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <FontScaleProvider>
        <FontScaleProbe onRender={(probe) => renders.push(probe)} />
      </FontScaleProvider>
    );
  });

  return { renders, tree };
}

const latest = (renders: Probe[]) => renders[renders.length - 1];

beforeEach(async () => {
  await AsyncStorage.clear();
  setTextScaleFactor(getTextScaleFactorForStep(TEXT_SCALE_DEFAULT_STEP));
  jest.restoreAllMocks();
});

describe("FontScaleProvider", () => {
  it("mặc định là nấc giữa khi chưa lưu gì", async () => {
    const { renders, tree } = await mountProbe();

    expect(latest(renders).step).toBe(TEXT_SCALE_DEFAULT_STEP);
    expect(latest(renders).factor).toBe(1);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("khôi phục nấc đã lưu và áp hệ số trước khi mount con", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, String(LAST_STEP));

    const { renders, tree } = await mountProbe();

    expect(latest(renders).step).toBe(LAST_STEP);
    expect(latest(renders).factor).toBe(TEXT_SCALE_STEPS[LAST_STEP]);
    // Hệ số phải được đặt ngay lần render đầu, không đợi effect sau đó — nếu
    // không, frame đầu sẽ nháy qua cỡ chữ mặc định.
    expect(getTextScaleFactor()).toBe(TEXT_SCALE_STEPS[LAST_STEP]);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("kẹp nấc lưu ngoài biên thay vì crash", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "99");

    const { renders, tree } = await mountProbe();

    expect(latest(renders).step).toBe(LAST_STEP);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("bỏ qua giá trị lạ trong storage", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "khong-phai-so");

    const { renders, tree } = await mountProbe();

    expect(latest(renders).step).toBe(TEXT_SCALE_DEFAULT_STEP);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("lưu lại nấc mới và cập nhật hệ số", async () => {
    const { renders, tree } = await mountProbe();

    await ReactTestRenderer.act(async () => {
      latest(renders).setStep(LAST_STEP);
    });

    expect(latest(renders).step).toBe(LAST_STEP);
    expect(getTextScaleFactor()).toBe(TEXT_SCALE_STEPS[LAST_STEP]);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).toBe(String(LAST_STEP));

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("vẫn mount được khi không đọc được storage", async () => {
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage hỏng"));

    const { renders, tree } = await mountProbe();

    expect(latest(renders).step).toBe(TEXT_SCALE_DEFAULT_STEP);
    expect(getTextScaleFactor()).toBe(1);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("giữ nấc trong phiên hiện tại dù lưu thất bại", async () => {
    const { renders, tree } = await mountProbe();

    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("storage đầy"));

    await ReactTestRenderer.act(async () => {
      latest(renders).setStep(LAST_STEP);
    });

    expect(latest(renders).step).toBe(LAST_STEP);
    expect(getTextScaleFactor()).toBe(TEXT_SCALE_STEPS[LAST_STEP]);

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
