import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";

import {
  formatSolarNumber,
  NO_VALUE,
  type MetricParts,
  type PlantWeatherState,
} from "./SolarPlantScreen.helpers";
import {
  getSkyKind,
  getSkyPalette,
  SCENE_H,
  SCENE_W,
  sceneViewBox,
  useLoop,
  WeatherGlyph,
  WeatherScene,
  type SceneFrame,
  type SkyScene,
} from "./SolarPlantScreen.flowWeather";
import { UnscaledText } from "../../utils/helpers/textScaling";

// ─── Hero dòng năng lượng (vẽ theo ảnh mẫu FusionSolar) ─────────────────────

/*
 * Mọi toạ độ trong file này đo trên ảnh mẫu 1182 × 1007 (`SCENE_W × SCENE_H`:
 * nhà xưởng mái răng cưa, tủ inverter, cột điện, ba vòng số liệu). Cả cảnh vẽ
 * trong đúng khung đó rồi thu theo bề ngang màn, nên chữ và vòng tròn đặt bằng
 * `toạ độ mẫu × scale` là khớp hình. Trời, đồi và hiệu ứng thời tiết nằm ở
 * `SolarPlantScreen.flowWeather`.
 */

/**
 * Cảnh cao gần bằng ngang (1007/1182): để nó rộng theo cả tablet 720 thì một
 * mình hero đã chiếm hơn nửa màn. Quá mốc này cảnh giữ cỡ mà giãn ngang cho kín
 * bề ngang (`SceneFrame.spread`): cụm Nhà máy dạt trái, cụm lưới dạt phải, tường
 * bên nhà xưởng và dây điện dài ra, vòng tròn vẫn tròn.
 */
const FLOW_HERO_MAX_WIDTH = 520;

/**
 * Mỗi bên giãn tối đa chừng này đơn vị ảnh mẫu (tablet dọc ~800 cần ~290). Màn
 * rộng hơn nữa (tablet ngang) thì phần trời / đồi hai bên kéo dài ra như cũ.
 */
const FLOW_HERO_MAX_SPREAD = 360;

/** Chữ xám trong ba vòng (chữ phía trên đổi màu theo trời, xem `getSkyPalette`). */
const TEXT_GRAY = "#676978";
const OUTLINE = "#5F6B8D";
const SOLAR_GREEN = "#00BC52";
const GRID_ORANGE = "#FE9418";

const getFlowHeroVisualWidth = (width: number) =>
  Math.min(width, FLOW_HERO_MAX_WIDTH);

/** Chiều cao hero theo bề ngang khối — khung chờ dùng để chừa đúng chỗ. */
export const getFlowHeroHeight = (width: number) =>
  Math.round((getFlowHeroVisualWidth(width) * SCENE_H) / SCENE_W);

/** Cỡ thu, chỗ đặt ảnh mẫu và độ giãn ngang theo bề ngang khối hero. */
export const getFlowHeroFrame = (width: number): SceneFrame => {
  const visualWidth = getFlowHeroVisualWidth(width);
  const scale = visualWidth / SCENE_W;
  const insetX = (width - visualWidth) / 2;

  return {
    height: getFlowHeroHeight(width),
    insetX,
    scale,
    spread: Math.min(insetX / scale, FLOW_HERO_MAX_SPREAD),
    width,
  };
};

/**
 * Hero nằm trong một card bo góc có viền, cách mép màn `FLOW_HERO_CARD_MARGIN`
 * — màn thật và khung chờ cùng dùng mấy số này để card cao / rộng y nhau.
 */
export const FLOW_HERO_CARD_MARGIN = 12;
export const FLOW_HERO_CARD_RADIUS = 16;
export const FLOW_HERO_CARD_BORDER = 1;

/** Bề ngang phần cảnh bên trong card (đã trừ lề hai bên và viền). */
export const getFlowHeroCardInnerWidth = (screenWidth: number) =>
  screenWidth - (FLOW_HERO_CARD_MARGIN + FLOW_HERO_CARD_BORDER) * 2;

/** Tường mặt tiền: cạnh trên là mái răng cưa hai răng. */
const FRONT_WALL =
  "415,785 537,710 537,783.6 643,710 643,783.6 749,710 751.5,710 751.5,1012 415,1012";
/**
 * Mảng sáng chéo trên tường bên (ánh nắng hắt), phủ cả dãy ô vàng. `shift` dời
 * cả mảng, `stretch` kéo riêng góc dưới trái theo mép tường khi tường dài ra.
 */
const sideWallLight = (shift = 0, stretch = 0) =>
  `${410 + shift},785 ${418 + shift},785 ${418 + shift},1012 ${
    106 + shift - stretch
  },1012`;

/** Hai răng mái kính: tam giác tối + hai dải kính sáng hơn. */
const ROOF_TEETH = [
  {
    glass: "537,710 537,783.6 642.8,710",
    stripes: [
      "538,724 605.7,724 575.5,745 538,745",
      "538,754 558.6,754 544.2,764 538,764",
    ],
  },
  {
    glass: "643,710 643,783.6 748.8,710",
    stripes: [
      "644,724 711.7,724 681.5,745 644,745",
      "644,754 664.6,754 650.2,764 644,764",
    ],
  },
] as const;

const BATTERY_ROWS = [846, 891, 933] as const;

const TOWER_PATH = [
  "M943,783 L919.7,832 M943,783 L966.3,832",
  "M919.7,832 V910 L883,1010 M966.3,832 V910 L1004.7,1010",
  "M868,850 H1016 M868,850 L919.7,883 M1016,850 L966.3,883",
  "M919.7,883.7 H966.3 M887,985 H999",
  "M931,808 L966.3,832 M955,808 L919.7,832",
  "M919.7,832 L966.3,883.7 M966.3,832 L919.7,883.7",
  "M919.7,883.7 L966.3,933.7 M966.3,883.7 L919.7,933.7 L913.5,933.7",
  "M913.5,933.7 L997,985 M972.5,933.7 L889,985",
].join(" ");

type FlowSceneSvgProps = {
  frame: SceneFrame;
  scene: SkyScene;
  showWeatherGlyph: boolean;
  /** Đang bán điện lên lưới: mũi tên lưới đổi chiều, sang màu điện mặt trời. */
  isExportingToGrid: boolean;
  /** Nhà máy đang lấy thêm điện lưới: dây vào nhà máy thành nét xanh xen cam. */
  isBuyingFromGrid: boolean;
};

/**
 * Lớp cảnh tĩnh phía trước: vòng số, biểu tượng thời tiết, nhà xưởng, dòng điện,
 * cột điện, cây. Giãn ngang (`frame.spread`): cụm trái / cụm phải vẽ trong nhóm
 * dời sang hai bên; tường bên, mái nghiêng và dây nối hai cụm vào tủ inverter
 * kéo dài bằng toạ độ.
 */
const FlowSceneSvg = React.memo(function FlowSceneSvg({
  frame,
  isBuyingFromGrid,
  isExportingToGrid,
  scene,
  showWeatherGlyph,
}: FlowSceneSvgProps) {
  const s = frame.spread;
  const toLeft = `translate(${-s}, 0)`;
  const toRight = `translate(${s}, 0)`;

  return (
    <Svg
      width={frame.width}
      height={frame.height}
      viewBox={sceneViewBox(frame)}
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id="flowFront" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#E9EEFE" />
          <Stop offset="1" stopColor="#F4F1F9" />
        </LinearGradient>
        <LinearGradient id="flowBox" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#F1F3F7" />
        </LinearGradient>
        <ClipPath id="flowBatteries">
          <Rect x={127 - s} y={846} width={155} height={112} />
        </ClipPath>
      </Defs>

      {/* ── Ba vòng số liệu (chữ do lớp View phía trên đặt) ── */}
      <G transform={toLeft}>
        <Circle
          cx={203}
          cy={556}
          r={126}
          fill="#FFFFFF"
          stroke="#BADCFF"
          strokeWidth={12}
        />
      </G>
      <G transform={toRight}>
        <Circle
          cx={931.5}
          cy={596.5}
          r={139.5}
          fill="none"
          stroke="#E4C584"
          strokeOpacity={0.75}
          strokeWidth={9}
        />
        <Circle
          cx={931.5}
          cy={596.5}
          r={132}
          fill="#FFFFFF"
          stroke="#F7A20F"
          strokeWidth={6}
        />
      </G>
      <Circle
        cx={585.5}
        cy={431}
        r={205}
        fill="none"
        stroke="#2FD06A"
        strokeOpacity={0.45}
        strokeWidth={8}
      />
      <Circle
        cx={585.5}
        cy={431}
        r={199}
        fill="#FFFFFF"
        stroke="#0CC655"
        strokeWidth={6}
      />

      {showWeatherGlyph ? (
        <G transform={toRight}>
          <WeatherGlyph scene={scene} />
        </G>
      ) : null}

      {/* ── Nhà xưởng: tường bên, mặt tiền mái răng cưa, mái pin ── */}
      <Path
        d={`M${104.5 - s},1012 V797 Q${104.5 - s},785 ${
          116 - s
        },785 H415 V1012 Z`}
        fill="#8BBEFF"
      />
      <Polygon
        points={sideWallLight(0, s)}
        fill="#F0F4FC"
        fillOpacity={0.55}
      />
      <Polygon points={FRONT_WALL} fill="#F3F0F9" />
      <Polygon points={FRONT_WALL} fill="url(#flowFront)" fillOpacity={0.6} />
      <Path
        d={`M${106 - s},785 L${268 - s},709.5 H537 L415,785 Z`}
        fill="#05103A"
      />
      <Polygon
        points={`${274 - s},718 501,718 467,739 ${228 - s},739`}
        fill="#35416F"
      />
      <Polygon
        points={`${213.4 - s},748 453.5,748 414.5,772 ${160.6 - s},772`}
        fill="#35416F"
      />
      {ROOF_TEETH.map((tooth) => (
        <G key={tooth.glass}>
          <Polygon points={tooth.glass} fill="#06103A" />
          {tooth.stripes.map((stripe) => (
            <Polygon key={stripe} points={stripe} fill="#35416F" />
          ))}
        </G>
      ))}
      <Path
        d={`M${104.5 - s},1012 V797 Q${104.5 - s},784 ${117 - s},779 L${
          262 - s
        },710 Q${268 - s},707 ${276 - s},707 H751.5 V1012`}
        fill="none"
        stroke={OUTLINE}
        strokeWidth={5}
        strokeLinejoin="round"
      />

      {BATTERY_ROWS.map((y) => (
        <G key={y} transform={toLeft}>
          <Rect
            x={127}
            y={y}
            width={155}
            height={25}
            rx={4}
            fill="#FCEBA8"
            stroke="#64708F"
            strokeWidth={4}
          />
          <Line
            x1={177.5}
            y1={y}
            x2={177.5}
            y2={y + 25}
            stroke="#64708F"
            strokeWidth={3.5}
          />
          <Line
            x1={228.5}
            y1={y}
            x2={228.5}
            y2={y + 25}
            stroke="#64708F"
            strokeWidth={3.5}
          />
        </G>
      ))}
      <Polygon
        points={sideWallLight(-s)}
        fill="#FFFFFF"
        fillOpacity={0.32}
        clipPath="url(#flowBatteries)"
      />

      {/* ── Tủ inverter ── */}
      <Rect
        x={496.5}
        y={859.5}
        width={168}
        height={104.5}
        rx={8}
        fill="#BBDCFD"
      />
      <Rect
        x={503.5}
        y={852.5}
        width={168}
        height={104.5}
        rx={8}
        fill="url(#flowBox)"
        stroke={OUTLINE}
        strokeWidth={5}
      />
      <Polygon points="577,892 611,892 600,917 566,917" fill="#EE2430" />

      {/* ── Dòng năng lượng ── */}
      <Line
        x1={586.5}
        y1={632}
        x2={586.5}
        y2={826}
        stroke={SOLAR_GREEN}
        strokeWidth={12}
      />
      <Polygon
        points="573,821 600,821 586.5,844"
        fill={SOLAR_GREEN}
        stroke={SOLAR_GREEN}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {isExportingToGrid ? (
        <G>
          <Line
            x1={700}
            y1={903.5}
            x2={856 + s}
            y2={903.5}
            stroke={SOLAR_GREEN}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Polygon
            points="852,889.5 852,917.5 874,903.5"
            transform={toRight}
            fill={SOLAR_GREEN}
            stroke={SOLAR_GREEN}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      ) : (
        <G>
          <Line
            x1={874 + s}
            y1={903.5}
            x2={714}
            y2={903.5}
            stroke={GRID_ORANGE}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Polygon
            points="718,889.5 718,917.5 696,903.5"
            fill={GRID_ORANGE}
            stroke={GRID_ORANGE}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      )}

      <Line
        x1={475}
        y1={903.5}
        x2={322 - s}
        y2={903.5}
        stroke="#12B84A"
        strokeWidth={12}
        strokeLinecap="round"
      />
      {isBuyingFromGrid ? (
        <Line
          x1={339 - s}
          y1={903.5}
          x2={475}
          y2={903.5}
          stroke="#FD9518"
          strokeWidth={12}
          strokeDasharray="17 19"
        />
      ) : null}
      <Polygon
        points="324,889.5 324,917.5 303,903.5"
        transform={toLeft}
        fill="#12B84A"
        stroke="#12B84A"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* ── Cột điện, cây ── */}
      <Path
        d={TOWER_PATH}
        transform={toRight}
        fill="none"
        stroke="#6B7494"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <G fill="#0CA853">
        <G transform={toLeft}>
          <Polygon points="50,935 22,1010 78,1010" />
          <Ellipse cx={100} cy={1012} rx={12} ry={12} />
        </G>
        <G transform={toRight}>
          <Polygon points="1046,964 1023,1010 1069,1010" />
          <Polygon points="1091,935 1065,1010 1117,1010" />
          <Ellipse cx={940} cy={1012} rx={40} ry={22} />
        </G>
        <Ellipse cx={797} cy={1012} rx={50} ry={29} />
      </G>
    </Svg>
  );
});

// ─── Chấm sáng chạy trên dây ────────────────────────────────────────────────

/** Một đoạn dây, ghi theo chiều dòng điện chạy; dây chỉ nằm ngang hoặc dọc. */
type FlowLane = {
  from: { x: number; y: number };
  to: { x: number; y: number };
};

/** Mặt trời → tủ inverter (dừng trước đầu mũi tên). */
const PV_LANE: FlowLane = { from: { x: 586.5, y: 636 }, to: { x: 586.5, y: 820 } };
/** Tủ → nhà máy. Đầu phía nhà máy / lưới dời theo `SceneFrame.spread`. */
const loadLane = (spread: number): FlowLane => ({
  from: { x: 475, y: 903.5 },
  to: { x: 326 - spread, y: 903.5 },
});
/** Lưới → tủ (đang mua) và tủ → lưới (đang bán). */
const gridInLane = (spread: number): FlowLane => ({
  from: { x: 874 + spread, y: 903.5 },
  to: { x: 720, y: 903.5 },
});
const gridOutLane = (spread: number): FlowLane => ({
  from: { x: 700, y: 903.5 },
  to: { x: 850 + spread, y: 903.5 },
});

/** Cỡ chấm, khoảng cách hai chấm và bề dày dải cắt (đủ chỗ cho quầng sáng). */
const FLOW_DOT_SIZE = 16;
const FLOW_DOT_GAP = 64;
const FLOW_LANE_THICKNESS = 30;

/**
 * Thời gian chấm đi hết một khoảng: công suất càng lớn chạy càng nhanh (1 kW
 * ~1,6 giây, 1 MW ~0,7 giây). Làm tròn 200 ms để số nhích nhẹ sau mỗi lượt tải
 * lại không làm vòng lặp khởi động lại. Không có điện thì `null` — dây đứng yên.
 */
const flowDotDuration = (watt: number | null | undefined) => {
  if (watt == null || !(watt >= 50)) return null;
  const ms = 1600 - 300 * Math.log10(Math.max(watt / 1000, 1));
  return Math.round(Math.min(Math.max(ms, 600), 1600) / 200) * 200;
};

/**
 * Chấm sáng trôi dọc một đoạn dây như dòng điện đang chạy (kiểu FusionSolar).
 * Cả dải chấm trượt đúng một khoảng rồi lặp lại — nhìn liền mạch mà chỉ cần một
 * giá trị `useLoop` chạy native driver, không vẽ lại SVG.
 */
const FlowDots: React.FC<{
  duration: number;
  frame: SceneFrame;
  lane: FlowLane;
}> = ({ duration, frame, lane }) => {
  const progress = useLoop(true, duration);
  const { from, to } = lane;
  const isVertical = from.x === to.x;
  const delta = isVertical ? to.y - from.y : to.x - from.x;
  const length = Math.abs(delta) * frame.scale;
  const gap = FLOW_DOT_GAP * frame.scale;
  const dot = FLOW_DOT_SIZE * frame.scale;
  const thickness = FLOW_LANE_THICKNESS * frame.scale;
  const start = {
    x: frame.insetX + Math.min(from.x, to.x) * frame.scale,
    y: Math.min(from.y, to.y) * frame.scale,
  };
  const shift = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, delta > 0 ? gap : -gap],
  });
  // Thừa một chấm mỗi đầu để lúc trượt không hở khoảng trống ở đầu dây.
  const positions = Array.from(
    { length: Math.ceil(length / gap) + 3 },
    (_, index) => (index - 1) * gap,
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.flowLane,
        isVertical
          ? {
              left: start.x - thickness / 2,
              top: start.y,
              width: thickness,
              height: length,
            }
          : {
              left: start.x,
              top: start.y - thickness / 2,
              width: length,
              height: thickness,
            },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: [
              isVertical ? { translateY: shift } : { translateX: shift },
            ],
          },
        ]}
      >
        {positions.map((position) => (
          <View
            key={position}
            style={[
              styles.flowDot,
              {
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                left: isVertical ? (thickness - dot) / 2 : position - dot / 2,
                top: isVertical ? position - dot / 2 : (thickness - dot) / 2,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
};

// ─── Nhãn "Trực tiếp" ────────────────────────────────────────────────────────

const LIVE_GREEN = "#2FD06A";

/** Chữ sáng (trời tối, mưa) thì viên nhãn trong mờ; chữ tối thì nền trắng đục. */
const isLightColor = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) =>
    parseInt(hex.slice(start, start + 2), 16),
  );
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
};

/**
 * Viên nhãn dưới "Sản lượng hôm nay": ban ngày chấm xanh nhịp như đèn báo
 * "Trực tiếp" (màn tự tải lại mỗi 2 phút), ban đêm trăng + "Hết nắng" để con số
 * 0 kW không bị đọc thành sự cố.
 */
const LiveBadge: React.FC<{
  isNight: boolean;
  scale: number;
  textColor: string;
}> = ({ isNight, scale, textColor }) => {
  const pulse = useLoop(!isNight, 1600);
  const at = (value: number) => value * scale;
  const dot = at(16);
  const isLightText = isLightColor(textColor);

  return (
    <View
      style={[
        styles.liveBadge,
        isLightText ? styles.liveBadgeOnDarkSky : styles.liveBadgeOnLightSky,
        {
          left: at(123),
          top: at(246),
          height: at(52),
          paddingHorizontal: at(20),
          borderRadius: at(26),
          gap: at(12),
        },
      ]}
    >
      {isNight ? (
        <Ionicons name="moon" size={at(28)} color="#FFD76A" />
      ) : (
        <View style={{ width: dot, height: dot }}>
          <Animated.View
            style={[
              styles.liveHalo,
              {
                borderRadius: dot / 2,
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 2.6],
                    }),
                  },
                ],
              },
            ]}
          />
          <View style={[styles.liveDot, { borderRadius: dot / 2 }]} />
        </View>
      )}
      <UnscaledText
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.liveText, { color: textColor, fontSize: at(32) }]}
      >
        {isNight ? "Hết nắng" : "Trực tiếp"}
      </UnscaledText>
    </View>
  );
};

// ─── Số chạy đếm ─────────────────────────────────────────────────────────────

/** "1,234.5" → 1234.5 kèm số chữ số lẻ; dấu "—" hay chuỗi lạ thì `null`. */
const parseMetricNumber = (text: string) => {
  if (!/^-?[\d,]+(\.\d+)?$/.test(text)) return null;
  return {
    value: Number(text.replace(/,/g, "")),
    digits: text.split(".")[1]?.length ?? 0,
  };
};

const COUNT_UP_MS = 700;

/**
 * Số mới chạy dần từ số cũ (vừa có số lần đầu thì chạy từ 0) thay vì nhảy phắt.
 * Gắn component mà đã có số thì hiện luôn; đổi đơn vị (kW ↔ MW) thì nhảy thẳng
 * vì đếm giữa hai đơn vị là sai số.
 */
const useCountUp = ({ unit, value }: MetricParts) => {
  const [shown, setShown] = useState(value);
  const previous = useRef({ unit, value });

  useEffect(() => {
    const from = previous.current;
    previous.current = { unit, value };
    const target = parseMetricNumber(value);
    const origin =
      from.value === NO_VALUE ? { value: 0 } : parseMetricNumber(from.value);

    if (
      !target ||
      !origin ||
      (from.value !== NO_VALUE && from.unit !== unit) ||
      origin.value === target.value
    ) {
      setShown(value);
      return undefined;
    }

    const startedAt = Date.now();
    let frameId = 0;
    const tick = () => {
      const progress = Math.min((Date.now() - startedAt) / COUNT_UP_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(
        progress >= 1
          ? value
          : formatSolarNumber(
              origin.value + (target.value - origin.value) * eased,
              target.digits,
            ),
      );
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [unit, value]);

  return shown;
};

/**
 * Chữ đặt theo đường chân chữ (baseline) đo trên ảnh mẫu. `Text` canh theo
 * đỉnh dòng nên quy đổi: dòng cao 1.2 × cỡ chữ thì chân chữ nằm cách đỉnh dòng
 * ~0.956 × cỡ chữ (SF Pro / Roboto).
 */
const lineTopFromBaseline = (baseline: number, fontSize: number) =>
  baseline - fontSize * 0.956;

type BubbleTextProps = {
  /** Tâm vòng và bán kính phần trắng bên trong, theo toạ độ ảnh mẫu. */
  cx: number;
  innerRadius: number;
  /** Chân chữ của dòng số và của dòng nhãn đầu tiên. */
  valueBaseline: number;
  labelBaseline: number;
  valueSize: number;
  unitSize: number;
  labelSize: number;
  labelLineHeight: number;
  metric: MetricParts;
  label: string;
  scale: number;
};

const BubbleText: React.FC<BubbleTextProps> = ({
  cx,
  innerRadius,
  label,
  labelBaseline,
  labelLineHeight,
  labelSize,
  metric,
  scale,
  unitSize,
  valueBaseline,
  valueSize,
}) => {
  const valueLineHeight = valueSize * 1.2;
  const valueTop = lineTopFromBaseline(valueBaseline, valueSize);
  // Nhãn nhiều dòng giãn dòng rộng hơn 1.2: đỉnh dòng tính theo dòng đầu.
  const labelTop =
    labelBaseline -
    (labelLineHeight - labelSize * 1.19) / 2 -
    labelSize * 0.952;
  // Chừa mép để số dài ("1.234,5") tự co lại chứ không chạm viền vòng.
  const sidePadding = innerRadius * 0.14;
  const shownValue = useCountUp(metric);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.bubbleText,
        {
          left: (cx - innerRadius + sidePadding) * scale,
          top: valueTop * scale,
          width: (innerRadius - sidePadding) * 2 * scale,
        },
      ]}
    >
      <View style={styles.bubbleValueRow}>
        <UnscaledText
          adjustsFontSizeToFit
          allowFontScaling={false}
          minimumFontScale={0.6}
          numberOfLines={1}
          style={[
            styles.bubbleValue,
            {
              fontSize: valueSize * scale,
              lineHeight: valueLineHeight * scale,
            },
          ]}
        >
          {shownValue}
        </UnscaledText>
        {metric.unit ? (
          <UnscaledText
            allowFontScaling={false}
            numberOfLines={1}
            style={[
              styles.bubbleUnit,
              {
                fontSize: unitSize * scale,
                marginLeft: unitSize * 0.4 * scale,
              },
            ]}
          >
            {metric.unit}
          </UnscaledText>
        ) : null}
      </View>
      <UnscaledText
        allowFontScaling={false}
        numberOfLines={2}
        style={[
          styles.bubbleLabel,
          {
            fontSize: labelSize * scale,
            lineHeight: labelLineHeight * scale,
            marginTop: (labelTop - (valueTop + valueLineHeight)) * scale,
          },
        ]}
      >
        {label}
      </UnscaledText>
    </View>
  );
};

type SolarFlowHeroProps = {
  /** Bề ngang khối hero (cả màn). */
  width: number;
  todayEnergy: MetricParts;
  loadPower: MetricParts;
  pvPower: MetricParts;
  gridPower: MetricParts;
  gridLabel: string;
  /** Công suất lưới (W) — chỉ dùng để biết nhà máy có đang lấy điện lưới. */
  gridWatt: number | null;
  /** Công suất (W) của mặt trời / nhà máy — chỉ để chỉnh tốc độ chấm chạy. */
  pvWatt?: number | null;
  loadWatt?: number | null;
  isExportingToGrid: boolean;
  /** Đã có số dòng năng lượng thật: hiện nhãn "Trực tiếp" và chấm chạy. */
  isLive?: boolean;
  weather: PlantWeatherState;
};

/** Số "Sản lượng hôm nay" — tách riêng để lúc số chạy đếm chỉ dòng này vẽ lại. */
const TodayEnergyText: React.FC<{
  energy: MetricParts;
  scale: number;
  textColor: string;
}> = ({ energy, scale, textColor }) => {
  const shownValue = useCountUp(energy);
  const at = (value: number) => value * scale;

  return (
    <UnscaledText
      adjustsFontSizeToFit
      allowFontScaling={false}
      minimumFontScale={0.7}
      numberOfLines={1}
      style={[
        styles.prodValue,
        {
          color: textColor,
          left: at(123),
          top: at(lineTopFromBaseline(213.5, 63.3)),
          // Dừng trước biểu tượng thời tiết.
          width: at(600),
          fontSize: at(63.3),
          lineHeight: at(63.3 * 1.2),
        },
      ]}
    >
      {shownValue}
      {energy.unit ? (
        <UnscaledText allowFontScaling={false} style={{ fontSize: at(47.6) }}>
          {` ${energy.unit}`}
        </UnscaledText>
      ) : null}
    </UnscaledText>
  );
};

/**
 * Hero của màn Điện mặt trời, dựng lại đúng ảnh mẫu: trời + nhà xưởng mái pin,
 * vòng xanh lá là công suất điện mặt trời đổ xuống tủ inverter, vòng xanh nhạt
 * là phần nhà máy đang dùng, vòng cam là lưới điện. Dùng chung cho mọi nhà máy
 * (Vĩnh Lộc, Bến Lức) — trước đây mỗi nhà máy một ảnh chụp thật.
 *
 * Trời đổi theo thời tiết thật (nắng, mây, sương, mưa, dông, đêm — xem
 * `WeatherScene`); số liệu là `Text` đặt đè theo toạ độ ảnh mẫu, để số dài
 * còn tự co cho vừa vòng (`adjustsFontSizeToFit`). Trên dây có chấm sáng chạy
 * theo chiều dòng điện, nhanh chậm theo công suất (`FlowDots`).
 */
export const SolarFlowHero: React.FC<SolarFlowHeroProps> = ({
  gridLabel,
  gridPower,
  gridWatt,
  isExportingToGrid,
  isLive = false,
  loadPower,
  loadWatt,
  pvPower,
  pvWatt,
  todayEnergy,
  weather,
  width,
}) => {
  const frame = useMemo(() => getFlowHeroFrame(width), [width]);
  const { height, insetX, scale, spread } = frame;
  const kind = getSkyKind(weather.weatherCode);
  const isNight = weather.isDay === false;
  const scene = useMemo<SkyScene>(() => ({ isNight, kind }), [isNight, kind]);
  const textColor = getSkyPalette(scene).text;
  const hasTemperature = !weather.isLoading && weather.temperature != null;
  // Chưa có số lưới thì vẽ như ảnh mẫu (đang mua điện lưới).
  const isBuyingFromGrid =
    !isExportingToGrid && (gridWatt == null || gridWatt > 0);
  const pvDuration = isLive ? flowDotDuration(pvWatt) : null;
  const loadDuration = isLive ? flowDotDuration(loadWatt) : null;
  const gridDuration = isLive ? flowDotDuration(gridWatt) : null;

  const at = (value: number) => value * scale;

  return (
    <View style={[styles.root, { height, width }]}>
      <WeatherScene
        frame={frame}
        scene={scene}
        foreground={
          <FlowSceneSvg
            frame={frame}
            isBuyingFromGrid={isBuyingFromGrid}
            isExportingToGrid={isExportingToGrid}
            scene={scene}
            showWeatherGlyph={hasTemperature}
          />
        }
      />

      {pvDuration != null ? (
        <FlowDots duration={pvDuration} frame={frame} lane={PV_LANE} />
      ) : null}
      {loadDuration != null ? (
        <FlowDots
          duration={loadDuration}
          frame={frame}
          lane={loadLane(spread)}
        />
      ) : null}
      {gridDuration != null ? (
        <FlowDots
          duration={gridDuration}
          frame={frame}
          lane={isExportingToGrid ? gridOutLane(spread) : gridInLane(spread)}
        />
      ) : null}

      {/* Khung chữ trải từ mép cụm trái (x = −spread) tới mép cụm phải: chữ
          cụm trái giữ toạ độ mẫu, vòng giữa + `spread`, vòng lưới + 2 × `spread`,
          nhiệt độ canh phải nên giữ nguyên. */}
      <View
        pointerEvents="none"
        style={[
          styles.overlay,
          {
            left: insetX - spread * scale,
            width: (SCENE_W + spread * 2) * scale,
            height,
          },
        ]}
      >
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.prodLabel,
            {
              color: textColor,
              left: at(123),
              top: at(lineTopFromBaseline(126.5, 42)),
              fontSize: at(42),
              lineHeight: at(42 * 1.2),
            },
          ]}
        >
          Sản lượng hôm nay
        </UnscaledText>
        <TodayEnergyText
          energy={todayEnergy}
          scale={scale}
          textColor={textColor}
        />
        {isLive ? (
          <LiveBadge isNight={isNight} scale={scale} textColor={textColor} />
        ) : null}
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={1}
          style={[
            styles.temperature,
            {
              color: textColor,
              right: at(SCENE_W - 1052),
              top: at(lineTopFromBaseline(216, 63.3)),
              fontSize: at(63.3),
              lineHeight: at(63.3 * 1.2),
            },
          ]}
        >
          {hasTemperature ? `${weather.temperature} °C` : `${NO_VALUE} °C`}
        </UnscaledText>

        <BubbleText
          cx={203}
          innerRadius={120}
          label="Nhà máy"
          labelBaseline={618.5}
          labelLineHeight={42.6}
          labelSize={35.5}
          metric={loadPower}
          scale={scale}
          unitSize={35.6}
          valueBaseline={557}
          valueSize={63.3}
        />
        <BubbleText
          cx={585.5 + spread}
          innerRadius={196}
          label={`Điện mặt trời\nhiện tại`}
          labelBaseline={504}
          labelLineHeight={48}
          labelSize={35.5}
          metric={pvPower}
          scale={scale}
          unitSize={35.6}
          valueBaseline={431.5}
          valueSize={119.2}
        />
        <BubbleText
          cx={931.5 + spread * 2}
          innerRadius={129}
          label={gridLabel}
          labelBaseline={658}
          labelLineHeight={42.6}
          labelSize={35.5}
          metric={gridPower}
          scale={scale}
          unitSize={35.6}
          valueBaseline={597}
          valueSize={63.3}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 0,
  },
  prodLabel: {
    position: "absolute",
    fontWeight: "500",
  },
  prodValue: {
    position: "absolute",
    fontWeight: "400",
  },
  flowLane: {
    position: "absolute",
    overflow: "hidden",
  },
  flowDot: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
  liveBadge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  liveBadgeOnDarkSky: { backgroundColor: "rgba(255,255,255,0.16)" },
  liveBadgeOnLightSky: { backgroundColor: "rgba(255,255,255,0.72)" },
  liveHalo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LIVE_GREEN,
  },
  liveDot: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: LIVE_GREEN,
  },
  liveText: {
    fontWeight: "600",
  },
  temperature: {
    position: "absolute",
    fontWeight: "400",
    textAlign: "right",
  },
  bubbleText: {
    position: "absolute",
    alignItems: "center",
  },
  bubbleValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    maxWidth: "100%",
  },
  bubbleValue: {
    flexShrink: 1,
    color: TEXT_GRAY,
    fontWeight: "400",
  },
  bubbleUnit: {
    color: TEXT_GRAY,
    fontWeight: "400",
  },
  bubbleLabel: {
    color: TEXT_GRAY,
    fontWeight: "400",
    textAlign: "center",
  },
});
