import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

// ─── Thời tiết của khung cảnh hero ──────────────────────────────────────────

/**
 * Khung vẽ gốc của cảnh, đo theo ảnh mẫu FusionSolar 1182 × 1007 — mọi toạ độ
 * trong file này và `SolarPlantScreen.flowHero` đều theo khung này.
 */
export const SCENE_W = 1182;
export const SCENE_H = 1007;

/**
 * Bảy kiểu trời theo mã WMO của Open-Meteo. Gộp theo cái mắt thấy được chứ
 * không theo từng mã: 1 và 2 đều là "có vài đám mây", 61–67 với 80–82 đều là
 * mưa.
 */
export type SkyKind =
  | "sunny"
  | "partly"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm";

export const getSkyKind = (weatherCode?: number): SkyKind => {
  // Chưa có số thời tiết thì vẽ trời như ảnh mẫu, không thêm hiệu ứng gì.
  if (weatherCode == null) return "partly";
  if (weatherCode === 0) return "sunny";
  if (weatherCode <= 2) return "partly";
  if (weatherCode === 3) return "overcast";
  if (weatherCode === 45 || weatherCode === 48) return "fog";
  if (weatherCode >= 51 && weatherCode <= 57) return "drizzle";
  if (
    (weatherCode >= 61 && weatherCode <= 67) ||
    (weatherCode >= 80 && weatherCode <= 82)
  ) {
    return "rain";
  }
  if (weatherCode >= 95 && weatherCode <= 99) return "storm";
  // Tuyết (71–77, 85–86) không có ở nhà máy — coi như trời âm u.
  return "overcast";
};

export type SkyScene = { kind: SkyKind; isNight: boolean };

/** Kích thước khối hero và cách quy toạ độ ảnh mẫu ra điểm ảnh. */
export type SceneFrame = {
  width: number;
  height: number;
  /** Lề trái khi cảnh bị chặn bề ngang (tablet); cảnh kéo dài trời sang hai bên. */
  insetX: number;
  scale: number;
  /**
   * Màn rộng hơn cảnh (tablet): cụm trái (vòng Nhà máy, tường bên nhà xưởng)
   * dời sang trái, cụm phải (vòng lưới, cột điện, thời tiết) dời sang phải bấy
   * nhiêu đơn vị ảnh mẫu; tường bên và dây điện dài ra cho liền. Điện thoại: 0.
   */
  spread: number;
};

/**
 * Toạ độ x ảnh mẫu sau khi giãn ngang (`SceneFrame.spread`): bên trái nhà xưởng
 * dời trái, từ mép phải nhà xưởng trở ra dời phải, khúc giữa đứng yên.
 */
export const spreadX = (x: number, spread: number) =>
  x < 400 ? x - spread : x > 752 ? x + spread : x;

/** Đổi mọi cặp "x,y" trong `d` của path / `points` của polygon theo `mapX`. */
export const mapCoordsX = (text: string, mapX: (x: number) => number) =>
  text.replace(
    /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
    (_, x: string, y: string) => `${mapX(Number(x))},${y}`,
  );

/** Mép trái và bề ngang vùng nhìn thấy, theo toạ độ ảnh mẫu. */
const visibleRange = (frame: SceneFrame) => {
  const x0 = -frame.insetX / frame.scale;
  return { x0, x1: x0 + frame.width / frame.scale };
};

export const sceneViewBox = (frame: SceneFrame) => {
  const { x0, x1 } = visibleRange(frame);
  return `${x0} 0 ${x1 - x0} ${SCENE_H}`;
};

// ─── Bảng màu theo kiểu trời ────────────────────────────────────────────────

type SkyPalette = {
  sky: readonly (readonly [number, string])[];
  hill: string;
  groundRight: readonly [string, string, string];
  groundLeft: readonly [string, string];
  /** Chữ "Sản lượng hôm nay" và nhiệt độ — đêm thì phải sáng mới đọc được. */
  text: string;
  /** Quầng sáng quanh mặt trời (chỉ ban ngày, trời nắng / ít mây). */
  sunGlow: number;
};

const TEXT_DARK = "#2E3138";
const TEXT_LIGHT = "#F2F6FF";

/** Đúng màu ảnh mẫu: trời xanh trong, mưa vẫn sáng. */
const SAMPLE_PALETTE: SkyPalette = {
  sky: [
    [0, "#46C8FD"],
    [0.12, "#58CEFC"],
    [0.24, "#60D3FE"],
    [0.36, "#68D8FD"],
    [0.48, "#76DDFC"],
    [0.6, "#7BE3FC"],
    [0.68, "#80E5FE"],
    [1, "#86E8FE"],
  ],
  hill: "#B0F0FE",
  groundRight: ["#E0F2FA", "#C2E6FE", "#8ECFFF"],
  groundLeft: ["#C8F1FF", "#DDFBFF"],
  text: TEXT_DARK,
  sunGlow: 0.3,
};

const SKY_PALETTES: Record<SkyKind, SkyPalette> = {
  sunny: {
    sky: [
      [0, "#1E9FF2"],
      [0.25, "#3DB5F7"],
      [0.5, "#67CAFB"],
      [0.72, "#93DCFD"],
      [1, "#BDEBFF"],
    ],
    hill: "#D4F5FF",
    groundRight: ["#F4FCFF", "#D6F0FF", "#9BD6FF"],
    groundLeft: ["#DDF7FF", "#F0FDFF"],
    text: TEXT_DARK,
    sunGlow: 0.6,
  },
  partly: SAMPLE_PALETTE,
  overcast: {
    sky: [
      [0, "#7FA6BF"],
      [0.35, "#98B9CC"],
      [0.7, "#B4CCD9"],
      [1, "#C6D8E1"],
    ],
    hill: "#D7E5EC",
    groundRight: ["#EEF4F6", "#D5E3EA", "#A9C3D2"],
    groundLeft: ["#DCE8EE", "#EAF1F4"],
    text: TEXT_DARK,
    sunGlow: 0,
  },
  fog: {
    sky: [
      [0, "#A3BAC7"],
      [0.4, "#BFCFD8"],
      [0.75, "#D5E0E6"],
      [1, "#E1E9ED"],
    ],
    hill: "#E6EEF1",
    groundRight: ["#F3F6F7", "#E2EAEE", "#C3D3DC"],
    groundLeft: ["#E9F0F3", "#F3F7F8"],
    text: TEXT_DARK,
    sunGlow: 0,
  },
  drizzle: { ...SAMPLE_PALETTE, sunGlow: 0 },
  rain: { ...SAMPLE_PALETTE, sunGlow: 0 },
  storm: {
    sky: [
      [0, "#45708F"],
      [0.3, "#5A87A6"],
      [0.65, "#7AA3BD"],
      [1, "#98BCCF"],
    ],
    hill: "#A9C8D7",
    groundRight: ["#CFE0E8", "#AFCADA", "#7FA8C2"],
    groundLeft: ["#B5D0DD", "#C9DDE7"],
    text: "#1F2A33",
    sunGlow: 0,
  },
};

const NIGHT_CLEAR: SkyPalette = {
  sky: [
    [0, "#07142B"],
    [0.35, "#0F2448"],
    [0.7, "#1B3A68"],
    [1, "#284E82"],
  ],
  hill: "#2C4C7A",
  groundRight: ["#3A5D8C", "#2A4A76", "#1A3157"],
  groundLeft: ["#2F5283", "#24426C"],
  text: TEXT_LIGHT,
  sunGlow: 0,
};

const NIGHT_CLOUDY: SkyPalette = {
  sky: [
    [0, "#121C2C"],
    [0.35, "#1C2B42"],
    [0.7, "#2A3D58"],
    [1, "#364D6B"],
  ],
  hill: "#3A5070",
  groundRight: ["#4A607E", "#3A506D", "#26384F"],
  groundLeft: ["#3D5373", "#33486A"],
  text: TEXT_LIGHT,
  sunGlow: 0,
};

const isClearKind = (kind: SkyKind) => kind === "sunny" || kind === "partly";

export const getSkyPalette = ({ isNight, kind }: SkyScene): SkyPalette => {
  if (!isNight) return SKY_PALETTES[kind];
  return isClearKind(kind) ? NIGHT_CLEAR : NIGHT_CLOUDY;
};

// ─── Nền trời, đồi, đất ─────────────────────────────────────────────────────

/** Toạ độ quầng sáng mặt trời — trùng biểu tượng thời tiết góc trên phải. */
const SUN_X = 806;
const SUN_Y = 128;

const LEFT_HILL =
  "M-4000,677 L-5,677 C20,669 45,665 75,664 C130,662 200,672 262,714 L262,1007 L-4000,1007 Z";
const LEFT_GROUND =
  "M-4000,958 L-5,958 C30,948 70,940 110,933 L110,1010 L-4000,1010 Z";
const RIGHT_HILL =
  "M742,814 C750,803 768,790 790,784 C800,778 812,775 830,773 C842,768 852,760 862,748 C880,725 920,705 960,698 C1000,690 1030,676 1060,671 C1090,666 1110,672 1130,678 C1155,686 1172,698 1190,712 L5200,712 L5200,1007 L742,1007 Z";
const RIGHT_GROUND =
  "M742,900 C790,890 845,892 880,912 C905,926 930,945 958,946 C990,944 1010,926 1040,912 C1090,893 1140,878 1190,868 L5200,868 L5200,1010 L742,1010 Z";

/**
 * Đồi và đất bên phải khi giãn ngang: chân sát nhà xưởng (742) đứng yên, từ
 * chỗ trũng dưới cột điện (958) trở ra dời theo cột điện, khúc giữa kéo dài —
 * sườn đồi thoải ra chứ không hở trời giữa nhà xưởng và đồi.
 */
const stretchRightX = (x: number, spread: number) => {
  if (x <= 742) return x;
  if (x >= 958) return x + spread;
  return 742 + ((x - 742) * (216 + spread)) / 216;
};

export const SkyBackdrop: React.FC<{ frame: SceneFrame; scene: SkyScene }> = ({
  frame,
  scene,
}) => {
  const palette = getSkyPalette(scene);
  const { spread } = frame;
  const sunX = SUN_X + spread;
  const shiftLeft = (x: number) => x - spread;
  const stretchRight = (x: number) => stretchRightX(x, spread);

  return (
    <Svg
      width={frame.width}
      height={frame.height}
      viewBox={sceneViewBox(frame)}
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id="skyFill" x1="0" y1="0" x2="0" y2="1">
          {palette.sky.map(([offset, color]) => (
            <Stop key={offset} offset={offset} stopColor={color} />
          ))}
        </LinearGradient>
        <RadialGradient
          id="skySunGlow"
          cx={sunX}
          cy={SUN_Y}
          r={320}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={palette.sunGlow} />
          <Stop
            offset="0.35"
            stopColor="#FFF6D8"
            stopOpacity={palette.sunGlow * 0.45}
          />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient
          id="skyGroundRight"
          x1="0"
          y1="880"
          x2="0"
          y2="1007"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={palette.groundRight[0]} />
          <Stop offset="0.45" stopColor={palette.groundRight[1]} />
          <Stop offset="1" stopColor={palette.groundRight[2]} />
        </LinearGradient>
        <LinearGradient
          id="skyGroundLeft"
          x1="0"
          y1="930"
          x2="0"
          y2="1007"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={palette.groundLeft[0]} />
          <Stop offset="1" stopColor={palette.groundLeft[1]} />
        </LinearGradient>
      </Defs>

      <Rect
        x={-4000}
        y={0}
        width={9182}
        height={SCENE_H}
        fill="url(#skyFill)"
      />
      {palette.sunGlow > 0 && !scene.isNight ? (
        <Circle cx={sunX} cy={SUN_Y} r={320} fill="url(#skySunGlow)" />
      ) : null}
      <Path d={mapCoordsX(LEFT_HILL, shiftLeft)} fill={palette.hill} />
      <Path d={mapCoordsX(RIGHT_HILL, stretchRight)} fill={palette.hill} />
      <Path
        d={mapCoordsX(RIGHT_GROUND, stretchRight)}
        fill="url(#skyGroundRight)"
      />
      <Path
        d={mapCoordsX(LEFT_GROUND, shiftLeft)}
        fill="url(#skyGroundLeft)"
      />
    </Svg>
  );
};

// ─── Biểu tượng thời tiết góc trên phải ─────────────────────────────────────

/**
 * Mây kiểu ảnh mẫu: vẽ khối viền xám trước rồi khối trắng nhỏ hơn đè lên, ra
 * đường viền đều quanh các múi mây mà không cần ghép path.
 */
const CloudPair: React.FC<{ front: string; back: string }> = ({
  back,
  front,
}) => (
  <G>
    {(
      [
        ["#A8ADC6", 29.5, 36, 26, 31.5],
        [front, 26.3, 32.8, 22.8, 28.3],
      ] as const
    ).map(([fill, r1, r2, r3, h], index) => (
      <G key={index} fill={fill}>
        <Circle cx={760} cy={124} r={r1} />
        <Circle cx={795.5} cy={108} r={r2} />
        <Circle cx={812} cy={128} r={r3} />
        <Rect x={759.5} y={124} width={62} height={h} />
      </G>
    ))}
    {(
      [
        ["#A8ADC6", 18, 24, 25.5],
        [back, 14.8, 20.8, 22.3],
      ] as const
    ).map(([fill, rSide, rTop, h], index) => (
      <G key={index} fill={fill}>
        <Circle cx={818} cy={135} r={rSide} />
        <Circle cx={841} cy={126.5} r={rTop} />
        <Circle cx={864} cy={140} r={rSide} />
        <Rect x={818} y={130} width={46} height={h} />
      </G>
    ))}
  </G>
);

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Trăng khuyết: đĩa 32 khoét bởi đĩa 27 lệch lên phải. */
const MOON_PATH =
  "M803.8,96.1 A32,32 0 1 0 836.0,139.1 A27,27 0 0 1 803.8,96.1 Z";

const Moon: React.FC<{ dx?: number; dy?: number }> = ({ dx = 0, dy = 0 }) => (
  <G transform={`translate(${dx}, ${dy})`}>
    <Path d={MOON_PATH} fill="#FFE29A" />
  </G>
);

export const WeatherGlyph: React.FC<{ scene: SkyScene }> = ({ scene }) => {
  const { isNight, kind } = scene;

  if (kind === "sunny") {
    if (isNight) return <Moon />;

    return (
      <G>
        {SUN_RAYS.map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <Line
              key={angle}
              x1={SUN_X + Math.cos(rad) * 42}
              y1={SUN_Y + Math.sin(rad) * 42}
              x2={SUN_X + Math.cos(rad) * 54}
              y2={SUN_Y + Math.sin(rad) * 54}
              stroke="#FFC447"
              strokeWidth={7}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={SUN_X} cy={SUN_Y} r={31} fill="#FFC447" />
      </G>
    );
  }

  const isGloomy = kind === "overcast" || kind === "storm" || kind === "fog";
  const dashes =
    kind === "rain"
      ? [758, 782, 806]
      : kind === "storm" || kind === "drizzle"
      ? [758, 782]
      : [];

  return (
    <G>
      {dashes.length > 0 ? (
        <G
          stroke="#6A8EF5"
          strokeWidth={kind === "drizzle" ? 5 : 7}
          strokeLinecap="round"
        >
          {dashes.map((x) => (
            <Line
              key={x}
              x1={x}
              y1={175}
              x2={x - (kind === "drizzle" ? 8 : 13.5)}
              y2={kind === "drizzle" ? 190 : 200}
            />
          ))}
        </G>
      ) : null}
      {kind === "storm" ? (
        <Polygon
          points="811,156 829,156 825.5,168.5 848,169.5 807,204 817.5,177 800.5,177"
          fill="#F89B12"
          stroke="#F89B12"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      ) : null}
      {kind === "fog" ? (
        <G stroke="#C9D3DE" strokeWidth={6} strokeLinecap="round">
          <Line x1={744} y1={176} x2={846} y2={176} />
          <Line x1={762} y1={194} x2={866} y2={194} />
        </G>
      ) : null}
      {kind === "partly" ? (
        isNight ? (
          <Moon dx={30} dy={-28} />
        ) : (
          <Circle cx={836} cy={96} r={24} fill="#FFC447" />
        )
      ) : null}
      <CloudPair
        front={isGloomy ? "#E9EDF2" : "#FFFFFF"}
        back={isGloomy ? "#D3DAE3" : "#EEEEF6"}
      />
    </G>
  );
};

// ─── Hiệu ứng chuyển động ───────────────────────────────────────────────────

/**
 * Vòng lặp 0 → 1 chạy bằng native driver (chỉ đổi transform / opacity của
 * View), nên mưa rơi, mây trôi không làm React vẽ lại cảnh SVG. `phase` cho
 * vòng đầu bắt đầu giữa chừng để các đám mây không cùng xuất phát một lúc.
 */
export const useLoop = (enabled: boolean, duration: number, phase = 0) => {
  const value = useRef(new Animated.Value(phase)).current;

  useEffect(() => {
    if (!enabled) return undefined;

    let loop: Animated.CompositeAnimation | null = null;
    value.setValue(phase);
    const first = Animated.timing(value, {
      toValue: 1,
      duration: duration * (1 - phase),
      easing: Easing.linear,
      useNativeDriver: true,
    });

    first.start(({ finished }) => {
      if (!finished) return;
      value.setValue(0);
      loop = Animated.loop(
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loop.start();
    });

    return () => {
      first.stop();
      loop?.stop();
    };
  }, [duration, enabled, phase, value]);

  return value;
};

/**
 * Số giả ngẫu nhiên cố định hạt giống (Park–Miller) — vệt mưa, sao không nhảy
 * chỗ mỗi lần vẽ lại.
 */
const seededRandom = (seed: number) => {
  let state = seed % 2147483647 || 1;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
};

// ── Mưa ──

/** Độ nghiêng vệt mưa trong ảnh mẫu: đi xuống 1 thì lệch phải 0.6. */
const RAIN_SLANT = 0.6;

type RainStreak = {
  x: number;
  y: number;
  length: number;
  opacity: number;
};

type RainStyle = {
  /** Vệt mỗi 100 × 100 đơn vị ảnh mẫu. */
  density: number;
  color: string;
  width: number;
  opacity: readonly [number, number];
  length: readonly [number, number];
  /** Thời gian rơi hết một chiều cao cảnh. */
  duration: number;
  seed: number;
};

/**
 * Hai lớp mưa: lớp xa vệt sáng rơi chậm, lớp gần vệt xanh đậm rơi nhanh — y
 * như ảnh mẫu có hai loại vệt, giờ lệch tốc độ cho ra chiều sâu.
 */
const RAIN_LAYERS: Record<"drizzle" | "rain" | "storm", readonly RainStyle[]> =
  {
    drizzle: [
      {
        density: 0.12,
        color: "#C4D4FF",
        width: 3,
        opacity: [0.25, 0.5],
        length: [30, 70],
        duration: 3200,
        seed: 11,
      },
      {
        density: 0.1,
        color: "#3A78D2",
        width: 2.5,
        opacity: [0.18, 0.35],
        length: [30, 80],
        duration: 2400,
        seed: 12,
      },
    ],
    rain: [
      {
        density: 0.14,
        color: "#C4D4FF",
        width: 4,
        opacity: [0.28, 0.7],
        length: [50, 190],
        duration: 2600,
        seed: 21,
      },
      {
        density: 0.26,
        color: "#3A78D2",
        width: 3,
        opacity: [0.18, 0.6],
        length: [30, 150],
        duration: 1600,
        seed: 22,
      },
    ],
    storm: [
      {
        density: 0.18,
        color: "#D2DEFF",
        width: 4,
        opacity: [0.3, 0.7],
        length: [70, 220],
        duration: 2000,
        seed: 31,
      },
      {
        density: 0.4,
        color: "#24578F",
        width: 3.2,
        opacity: [0.25, 0.65],
        length: [50, 200],
        duration: 1150,
        seed: 32,
      },
    ],
  };

const buildRainStreaks = (style: RainStyle, x0: number, x1: number) => {
  const random = seededRandom(style.seed);
  // Rải cả phần lệch sang hai bên: lớp mưa trượt chéo một đoạn
  // `SCENE_H × RAIN_SLANT` mỗi vòng, thiếu phần đó là hở một góc.
  const left = x0 - SCENE_H * RAIN_SLANT;
  const right = x1 + SCENE_H * RAIN_SLANT;
  const count = Math.round(((right - left) * SCENE_H * style.density) / 10000);
  const streaks: RainStreak[] = [];

  for (let i = 0; i < count; i += 1) {
    streaks.push({
      x: left + random() * (right - left),
      y: random() * SCENE_H,
      length: style.length[0] + random() * (style.length[1] - style.length[0]),
      opacity:
        style.opacity[0] + random() * (style.opacity[1] - style.opacity[0]),
    });
  }

  return streaks;
};

/**
 * Một lớp mưa. Svg cao gấp đôi cảnh: nửa trên là bản sao của nửa dưới lệch đúng
 * một vòng trượt, View trượt chéo đúng một vòng rồi quay lại — chỗ nối liền
 * khít nên mưa rơi không thấy giật.
 */
const RainLayer: React.FC<{ frame: SceneFrame; rainStyle: RainStyle }> = ({
  frame,
  rainStyle,
}) => {
  const { x0, x1 } = visibleRange(frame);
  const streaks = useMemo(
    () => buildRainStreaks(rainStyle, x0, x1),
    [rainStyle, x0, x1],
  );
  const progress = useLoop(true, rainStyle.duration);
  const shiftX = SCENE_H * RAIN_SLANT;
  const layerWidth = frame.width + shiftX * frame.scale;
  const layerHeight = SCENE_H * 2 * frame.scale;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.layer,
        {
          left: -shiftX * frame.scale,
          top: -SCENE_H * frame.scale,
          width: layerWidth,
          height: layerHeight,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, shiftX * frame.scale],
              }),
            },
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, SCENE_H * frame.scale],
              }),
            },
          ],
        },
      ]}
    >
      <Svg
        width={layerWidth}
        height={layerHeight}
        viewBox={`${x0 - shiftX} ${-SCENE_H} ${x1 - x0 + shiftX} ${
          SCENE_H * 2
        }`}
      >
        <G
          stroke={rainStyle.color}
          strokeWidth={rainStyle.width}
          strokeLinecap="round"
        >
          {[0, 1].map((copy) =>
            streaks.map((streak, index) => {
              const x = streak.x - copy * shiftX;
              const y = streak.y - copy * SCENE_H;
              return (
                <Line
                  key={`${copy}-${index}`}
                  x1={x}
                  y1={y}
                  x2={x + streak.length * RAIN_SLANT}
                  y2={y + streak.length}
                  strokeOpacity={streak.opacity}
                />
              );
            }),
          )}
        </G>
      </Svg>
    </Animated.View>
  );
};

// ── Mây trôi ──

type DriftCloud = {
  y: number;
  size: number;
  duration: number;
  phase: number;
};

/** Mây trôi ngang bầu trời: đám trên cùng nằm trên dòng chữ, các đám dưới khuất sau vòng số. */
const DRIFT_CLOUDS: Partial<Record<SkyKind, readonly DriftCloud[]>> = {
  sunny: [{ y: 30, size: 0.55, duration: 95000, phase: 0.25 }],
  partly: [
    { y: 18, size: 0.65, duration: 85000, phase: 0.15 },
    { y: 260, size: 0.95, duration: 65000, phase: 0.62 },
    { y: 400, size: 0.7, duration: 105000, phase: 0.88 },
  ],
  overcast: [
    { y: 8, size: 1, duration: 75000, phase: 0.1 },
    { y: 250, size: 1.25, duration: 60000, phase: 0.42 },
    { y: 380, size: 1.05, duration: 90000, phase: 0.74 },
    { y: 60, size: 0.85, duration: 110000, phase: 0.93 },
  ],
  drizzle: [
    { y: 14, size: 0.9, duration: 80000, phase: 0.3 },
    { y: 270, size: 1.1, duration: 70000, phase: 0.8 },
  ],
  storm: [
    { y: 0, size: 1.2, duration: 55000, phase: 0.2 },
    { y: 250, size: 1.15, duration: 48000, phase: 0.55 },
    { y: 390, size: 1, duration: 70000, phase: 0.9 },
  ],
};

const CLOUD_W = 260;
const CLOUD_H = 120;

const getCloudTint = ({ isNight, kind }: SkyScene) => {
  if (isNight) {
    return isClearKind(kind)
      ? { color: "#2E4469", opacity: 0.7 }
      : { color: "#3E5374", opacity: 0.85 };
  }
  if (kind === "storm") return { color: "#7D91A5", opacity: 0.92 };
  if (kind === "overcast") return { color: "#EEF3F6", opacity: 0.95 };
  if (kind === "drizzle") return { color: "#F4F8FB", opacity: 0.75 };
  return { color: "#FFFFFF", opacity: 0.92 };
};

const DriftingCloud: React.FC<{
  cloud: DriftCloud;
  color: string;
  frame: SceneFrame;
  opacity: number;
}> = ({ cloud, color, frame, opacity }) => {
  const progress = useLoop(true, cloud.duration, cloud.phase);
  const cloudW = CLOUD_W * cloud.size * frame.scale;
  const cloudH = CLOUD_H * cloud.size * frame.scale;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.cloud,
        {
          top: cloud.y * frame.scale,
          width: cloudW,
          height: cloudH,
          opacity,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-cloudW, frame.width],
              }),
            },
          ],
        },
      ]}
    >
      <Svg width={cloudW} height={cloudH} viewBox={`0 0 ${CLOUD_W} ${CLOUD_H}`}>
        <G fill={color}>
          <Circle cx={62} cy={78} r={38} />
          <Circle cx={118} cy={52} r={50} />
          <Circle cx={178} cy={66} r={40} />
          <Circle cx={220} cy={86} r={28} />
          <Rect x={40} y={78} width={196} height={36} rx={18} />
        </G>
      </Svg>
    </Animated.View>
  );
};

// ── Nắng ──

/** Ba vệt nắng chéo từ góc trên phải, mờ tỏ chậm. */
const SunBeams: React.FC<{ frame: SceneFrame }> = ({ frame }) => {
  const progress = useLoop(true, 7000);
  const x = (value: number) => spreadX(value, frame.spread);
  const sun = `${x(SUN_X)},${SUN_Y}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity: progress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0.45, 1, 0.45],
          }),
        },
      ]}
    >
      <Svg
        width={frame.width}
        height={frame.height}
        viewBox={sceneViewBox(frame)}
      >
        <Defs>
          <LinearGradient
            id="sunBeam"
            x1={x(SUN_X)}
            y1={SUN_Y}
            x2={x(200)}
            y2={900}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FFFBE6" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <G fill="url(#sunBeam)">
          <Polygon
            points={`${sun} ${x(760)},${SUN_Y + 40} ${x(120)},820 ${x(260)},900`}
          />
          <Polygon points={`${sun} ${x(790)},${SUN_Y + 60} 430,1007 560,1007`} />
          <Polygon
            points={`${sun} ${x(770)},${SUN_Y + 30} ${x(-200)},560 ${x(-80)},660`}
          />
        </G>
      </Svg>
    </Animated.View>
  );
};

/** Chỗ lấp lánh trên mái pin (mái nghiêng và hai răng kính). */
const PANEL_SPARKLES = [
  [300, 728],
  [452, 729],
  [236, 760],
  [392, 760],
  [574, 734],
  [684, 734],
] as const;

const SPARKLE_SIZE = 44;

/**
 * Mái nghiêng (106 → góc mái 537) dài ra về bên trái khi giãn ngang: chỗ lấp
 * lánh trên đó rải đều theo, không dồn về một đầu.
 */
const sparkleX = (x: number, spread: number) =>
  x >= 537 ? x : 537 - ((537 - x) * (431 + spread)) / 431;

/** Tấm pin loé sáng lần lượt — nắng đang chiếu lên dàn pin. */
const PanelSparkles: React.FC<{ frame: SceneFrame }> = ({ frame }) => {
  const progress = useLoop(true, 4200);
  const size = SPARKLE_SIZE * frame.scale;

  return (
    <>
      {PANEL_SPARKLES.map(([sampleX, y], index) => {
        const x = sparkleX(sampleX, frame.spread);
        const peak = (index + 0.5) / PANEL_SPARKLES.length;
        return (
          <Animated.View
            key={`${sampleX}-${y}`}
            pointerEvents="none"
            style={[
              styles.layer,
              {
                left: frame.insetX + x * frame.scale - size / 2,
                top: y * frame.scale - size / 2,
                width: size,
                height: size,
                opacity: progress.interpolate({
                  inputRange: [
                    0,
                    Math.max(peak - 0.08, 0.001),
                    peak,
                    Math.min(peak + 0.08, 0.999),
                    1,
                  ],
                  outputRange: [0, 0, 1, 0, 0],
                }),
              },
            ]}
          >
            <Svg width={size} height={size} viewBox="-22 -22 44 44">
              <Circle r={9} fill="#FFFFFF" opacity={0.35} />
              <Path
                d="M0,-20 L3.2,-3.2 L20,0 L3.2,3.2 L0,20 L-3.2,3.2 L-20,0 L-3.2,-3.2 Z"
                fill="#FFFFFF"
              />
            </Svg>
          </Animated.View>
        );
      })}
    </>
  );
};

// ── Đêm ──

const STAR_GROUPS = 3;

/** Sao nhấp nháy theo ba nhóm lệch nhịp, chừa dải đồi phía dưới. */
const NightStars: React.FC<{ frame: SceneFrame }> = ({ frame }) => {
  const { x0, x1 } = visibleRange(frame);
  const groups = useMemo(() => {
    const random = seededRandom(7);
    const count = Math.round(((x1 - x0) / SCENE_W) * 54);
    const result: { x: number; y: number; r: number }[][] = Array.from(
      { length: STAR_GROUPS },
      () => [],
    );
    for (let i = 0; i < count; i += 1) {
      result[i % STAR_GROUPS].push({
        x: x0 + random() * (x1 - x0),
        y: 8 + random() * 620,
        r: 1.6 + random() * 2.4,
      });
    }
    return result;
  }, [x0, x1]);
  const progress = useLoop(true, 3600);

  return (
    <>
      {groups.map((stars, group) => {
        const shift = group / STAR_GROUPS;
        return (
          <Animated.View
            key={group}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange:
                    shift === 0
                      ? [1, 0.3, 1]
                      : shift < 0.5
                      ? [0.55, 1, 0.55]
                      : [0.3, 0.8, 0.3],
                }),
              },
            ]}
          >
            <Svg
              width={frame.width}
              height={frame.height}
              viewBox={sceneViewBox(frame)}
            >
              <G fill="#FFFFFF">
                {stars.map((star, index) => (
                  <Circle key={index} cx={star.x} cy={star.y} r={star.r} />
                ))}
              </G>
            </Svg>
          </Animated.View>
        );
      })}
    </>
  );
};

// ── Sương mù ──

const FogBand: React.FC<{
  frame: SceneFrame;
  y: number;
  height: number;
  opacity: number;
  drift: number;
  duration: number;
}> = ({ drift, duration, frame, height, opacity, y }) => {
  const progress = useLoop(true, duration);
  const id = `fog${y}`;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          opacity,
          transform: [
            {
              translateX: progress.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [
                  -drift * frame.scale,
                  drift * frame.scale,
                  -drift * frame.scale,
                ],
              }),
            },
          ],
        },
      ]}
    >
      <Svg
        width={frame.width}
        height={frame.height}
        viewBox={sceneViewBox(frame)}
      >
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={1} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect
          x={-4000}
          y={y}
          width={9182}
          height={height}
          fill={`url(#${id})`}
        />
      </Svg>
    </Animated.View>
  );
};

// ── Dông ──

/** Hai tia sét ở hai khoảng trời trống (trái, phải), chớp lệch nhịp nhau. */
const LIGHTNING_BOLTS = [
  "296,232 320,232 300,298 326,298 250,412 270,328 244,328",
  "1104,236 1128,236 1110,300 1136,300 1060,420 1080,334 1054,334",
] as const;

const useLightning = (enabled: boolean) => {
  const progress = useLoop(enabled, 6400);
  return useMemo(
    () => [
      progress.interpolate({
        inputRange: [0, 0.05, 0.07, 0.09, 0.15, 1],
        outputRange: [0, 1, 0.25, 1, 0, 0],
      }),
      progress.interpolate({
        inputRange: [0, 0.55, 0.58, 0.6, 0.62, 0.7, 1],
        outputRange: [0, 0, 1, 0.3, 0.9, 0, 0],
      }),
    ],
    [progress],
  );
};

// ─── Ghép lớp ───────────────────────────────────────────────────────────────

/**
 * Cảnh hero theo lớp, dưới lên trên: trời + đồi → mây trôi, mưa, sao, tia
 * nắng, sương → `foreground` (vòng số, nhà xưởng, cột điện) → lấp lánh trên
 * pin, chớp sáng, sương sát đất. Hiệu ứng nằm giữa hai lớp SVG tĩnh nên mưa,
 * mây khuất sau vòng số và nhà xưởng như ảnh thật.
 */
export const WeatherScene: React.FC<{
  frame: SceneFrame;
  scene: SkyScene;
  foreground: React.ReactNode;
}> = ({ foreground, frame, scene }) => {
  const { isNight, kind } = scene;
  const isStorm = kind === "storm";
  const flashes = useLightning(isStorm);
  const clouds = DRIFT_CLOUDS[kind] ?? [];
  const cloudTint = getCloudTint(scene);
  const rainLayers =
    kind === "drizzle" || kind === "rain" || kind === "storm"
      ? RAIN_LAYERS[kind]
      : [];

  return (
    <>
      <SkyBackdrop frame={frame} scene={scene} />

      {isNight && isClearKind(kind) ? <NightStars frame={frame} /> : null}
      {!isNight && kind === "sunny" ? <SunBeams frame={frame} /> : null}
      {clouds.map((cloud) => (
        <DriftingCloud
          key={`${cloud.y}-${cloud.size}`}
          cloud={cloud}
          color={cloudTint.color}
          frame={frame}
          opacity={cloudTint.opacity}
        />
      ))}
      {isStorm
        ? LIGHTNING_BOLTS.map((points, index) => (
            <Animated.View
              key={points}
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { opacity: flashes[index] }]}
            >
              <Svg
                width={frame.width}
                height={frame.height}
                viewBox={sceneViewBox(frame)}
              >
                <Polygon
                  points={mapCoordsX(points, (x) => spreadX(x, frame.spread))}
                  fill="#FFF6C4"
                  stroke="#FFFFFF"
                  strokeOpacity={0.6}
                  strokeWidth={6}
                  strokeLinejoin="round"
                />
              </Svg>
            </Animated.View>
          ))
        : null}
      {kind === "fog" ? (
        <>
          <FogBand
            drift={40}
            duration={14000}
            frame={frame}
            height={170}
            opacity={0.55}
            y={520}
          />
          <FogBand
            drift={60}
            duration={18000}
            frame={frame}
            height={180}
            opacity={0.6}
            y={700}
          />
        </>
      ) : null}
      {rainLayers.map((rainStyle) => (
        <RainLayer key={rainStyle.seed} frame={frame} rainStyle={rainStyle} />
      ))}

      {foreground}

      {!isNight && kind === "sunny" ? <PanelSparkles frame={frame} /> : null}
      {kind === "fog" ? (
        <FogBand
          drift={50}
          duration={16000}
          frame={frame}
          height={190}
          opacity={0.5}
          y={860}
        />
      ) : null}
      {isStorm
        ? flashes.map((flash, index) => (
            <Animated.View
              key={index}
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.flash,
                {
                  opacity: flash.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.22],
                  }),
                },
              ]}
            />
          ))
        : null}
    </>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
  },
  cloud: {
    position: "absolute",
    left: 0,
  },
  flash: {
    backgroundColor: "#FFFFFF",
  },
});
