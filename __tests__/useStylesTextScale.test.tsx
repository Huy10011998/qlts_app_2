import React from "react";
import { StyleSheet } from "react-native";
import ReactTestRenderer from "react-test-renderer";

import { ThemeProvider } from "../src/context/ThemeContext";
import { useStyles } from "../src/utils/helpers/colors";
import {
  getTextScaleFactor,
  getTextScaleFactorForStep,
  setTextScaleFactor,
  TEXT_SCALE_DEFAULT_STEP,
} from "../src/utils/helpers/textScaling";

const makeStyles = () =>
  StyleSheet.create({
    label: { height: 32 * getTextScaleFactor() },
  });

let seenHeight: number | undefined;

function Probe() {
  seenHeight = useStyles(makeStyles).label.height as number;
  return null;
}

const mount = async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
  });

  return tree;
};

afterEach(() => {
  setTextScaleFactor(getTextScaleFactorForStep(TEXT_SCALE_DEFAULT_STEP));
});

describe("useStyles và cỡ chữ của app", () => {
  it("dựng lại style khi đổi cỡ chữ, không trả bản đã dựng ở cỡ cũ", async () => {
    setTextScaleFactor(1);
    const first = await mount();
    expect(seenHeight).toBe(32);
    first.unmount();

    // Đổi cỡ chữ thì cây điều hướng remount — mount lại là đúng đường đi thật.
    setTextScaleFactor(1.5);
    const second = await mount();
    expect(seenHeight).toBe(48);
    second.unmount();
  });
});
