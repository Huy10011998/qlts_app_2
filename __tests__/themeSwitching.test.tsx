import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { ThemeProvider, useThemePreference } from "../src/context/ThemeContext";
import {
  APP_COLORS,
  useAppColors,
  useStyles,
} from "../src/utils/helpers/colors";

// Regression guard for the bug this palette was rebuilt to fix: a screen that
// was already mounted kept its old colors after the user picked a different
// appearance in Settings, because the values came from native adaptive colors
// resolved once at view creation. Colors now come from React state, so an
// already-mounted consumer must repaint.

const makeProbeStyles = (c: (typeof APP_COLORS)["light"]) => ({
  card: { backgroundColor: c.bg },
});

type Probe = {
  background: string;
  sheet: ReturnType<typeof makeProbeStyles>;
  setPreference: (p: "system" | "light" | "dark") => void;
};

function ThemeProbe({ onRender }: { onRender: (probe: Probe) => void }) {
  const colors = useAppColors();
  const sheet = useStyles(makeProbeStyles);
  const { setPreference } = useThemePreference();

  onRender({ background: colors.bg, sheet, setPreference });

  return null;
}

async function mountProbe() {
  const renders: Probe[] = [];
  let tree: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <ThemeProbe onRender={(probe) => renders.push(probe)} />
      </ThemeProvider>
    );
  });

  return { renders, tree: tree! };
}

const latest = (renders: Probe[]) => renders[renders.length - 1];

describe("appearance switching", () => {
  it("repaints an already-mounted consumer when the preference changes", async () => {
    const { renders, tree } = await mountProbe();

    expect(latest(renders).background).toBe(APP_COLORS.light.bg);

    await ReactTestRenderer.act(async () => {
      latest(renders).setPreference("dark");
    });

    expect(latest(renders).background).toBe(APP_COLORS.dark.bg);
    expect(latest(renders).sheet.card.backgroundColor).toBe(APP_COLORS.dark.bg);

    await ReactTestRenderer.act(async () => {
      latest(renders).setPreference("light");
    });

    expect(latest(renders).background).toBe(APP_COLORS.light.bg);
    expect(latest(renders).sheet.card.backgroundColor).toBe(
      APP_COLORS.light.bg
    );

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it("keeps one stable sheet per scheme so memoized children are not churned", async () => {
    const { renders, tree } = await mountProbe();

    const lightSheet = latest(renders).sheet;

    await ReactTestRenderer.act(async () => {
      latest(renders).setPreference("dark");
    });
    const darkSheet = latest(renders).sheet;
    expect(darkSheet).not.toBe(lightSheet);

    await ReactTestRenderer.act(async () => {
      latest(renders).setPreference("light");
    });
    expect(latest(renders).sheet).toBe(lightSheet);

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
