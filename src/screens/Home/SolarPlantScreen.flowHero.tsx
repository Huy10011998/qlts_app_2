import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
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
 * mình hero đã chiếm hơn nửa màn. Quá mốc này cảnh giữ cỡ, phần trời / đồi hai
 * bên kéo dài ra cho kín bề ngang (xem `viewBox` của `FlowSceneSvg`).
 */
const FLOW_HERO_MAX_WIDTH = 520;

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
/** Mảng sáng chéo trên tường bên (ánh nắng hắt), phủ cả dãy ô vàng. */
const SIDE_WALL_LIGHT = "410,785 418,785 418,1012 106,1012";

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

/** Lớp cảnh tĩnh phía trước: vòng số, biểu tượng thời tiết, nhà xưởng, dòng điện, cột điện, cây. */
const FlowSceneSvg = React.memo(function FlowSceneSvg({
  frame,
  isBuyingFromGrid,
  isExportingToGrid,
  scene,
  showWeatherGlyph,
}: FlowSceneSvgProps) {
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
          <Rect x={127} y={846} width={155} height={112} />
        </ClipPath>
      </Defs>

      {/* ── Ba vòng số liệu (chữ do lớp View phía trên đặt) ── */}
      <Circle
        cx={203}
        cy={556}
        r={126}
        fill="#FFFFFF"
        stroke="#BADCFF"
        strokeWidth={12}
      />
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

      {showWeatherGlyph ? <WeatherGlyph scene={scene} /> : null}

      {/* ── Nhà xưởng: tường bên, mặt tiền mái răng cưa, mái pin ── */}
      <Path
        d="M104.5,1012 V797 Q104.5,785 116,785 H415 V1012 Z"
        fill="#8BBEFF"
      />
      <Polygon points={SIDE_WALL_LIGHT} fill="#F0F4FC" fillOpacity={0.55} />
      <Polygon points={FRONT_WALL} fill="#F3F0F9" />
      <Polygon points={FRONT_WALL} fill="url(#flowFront)" fillOpacity={0.6} />
      <Path d="M106,785 L268,709.5 H537 L415,785 Z" fill="#05103A" />
      <Polygon points="274,718 501,718 467,739 228,739" fill="#35416F" />
      <Polygon
        points="213.4,748 453.5,748 414.5,772 160.6,772"
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
        d="M104.5,1012 V797 Q104.5,784 117,779 L262,710 Q268,707 276,707 H751.5 V1012"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={5}
        strokeLinejoin="round"
      />

      {BATTERY_ROWS.map((y) => (
        <G key={y}>
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
        points={SIDE_WALL_LIGHT}
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
            x2={856}
            y2={903.5}
            stroke={SOLAR_GREEN}
            strokeWidth={12}
            strokeLinecap="round"
          />
          <Polygon
            points="852,889.5 852,917.5 874,903.5"
            fill={SOLAR_GREEN}
            stroke={SOLAR_GREEN}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </G>
      ) : (
        <G>
          <Line
            x1={874}
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
        x2={322}
        y2={903.5}
        stroke="#12B84A"
        strokeWidth={12}
        strokeLinecap="round"
      />
      {isBuyingFromGrid ? (
        <Line
          x1={339}
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
        fill="#12B84A"
        stroke="#12B84A"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* ── Cột điện, cây ── */}
      <Path
        d={TOWER_PATH}
        fill="none"
        stroke="#6B7494"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <G fill="#0CA853">
        <Polygon points="50,935 22,1010 78,1010" />
        <Polygon points="1046,964 1023,1010 1069,1010" />
        <Polygon points="1091,935 1065,1010 1117,1010" />
        <Ellipse cx={797} cy={1012} rx={50} ry={29} />
        <Ellipse cx={940} cy={1012} rx={40} ry={22} />
        <Ellipse cx={100} cy={1012} rx={12} ry={12} />
      </G>
    </Svg>
  );
});

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
          {metric.value}
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
  isExportingToGrid: boolean;
  weather: PlantWeatherState;
};

/**
 * Hero của màn Điện mặt trời, dựng lại đúng ảnh mẫu: trời + nhà xưởng mái pin,
 * vòng xanh lá là công suất điện mặt trời đổ xuống tủ inverter, vòng xanh nhạt
 * là phần nhà máy đang dùng, vòng cam là lưới điện. Dùng chung cho mọi nhà máy
 * (Vĩnh Lộc, Bến Lức) — trước đây mỗi nhà máy một ảnh chụp thật.
 *
 * Trời đổi theo thời tiết thật (nắng, mây, sương, mưa, dông, đêm — xem
 * `WeatherScene`); số liệu là `Text` đặt đè theo toạ độ ảnh mẫu, để số dài
 * còn tự co cho vừa vòng (`adjustsFontSizeToFit`).
 */
export const SolarFlowHero: React.FC<SolarFlowHeroProps> = ({
  gridLabel,
  gridPower,
  gridWatt,
  isExportingToGrid,
  loadPower,
  pvPower,
  todayEnergy,
  weather,
  width,
}) => {
  const visualWidth = getFlowHeroVisualWidth(width);
  const scale = visualWidth / SCENE_W;
  const height = getFlowHeroHeight(width);
  const insetX = (width - visualWidth) / 2;
  const frame = useMemo<SceneFrame>(
    () => ({ height, insetX, scale, width }),
    [height, insetX, scale, width],
  );
  const kind = getSkyKind(weather.weatherCode);
  const isNight = weather.isDay === false;
  const scene = useMemo<SkyScene>(() => ({ isNight, kind }), [isNight, kind]);
  const textColor = getSkyPalette(scene).text;
  const hasTemperature = !weather.isLoading && weather.temperature != null;
  // Chưa có số lưới thì vẽ như ảnh mẫu (đang mua điện lưới).
  const isBuyingFromGrid =
    !isExportingToGrid && (gridWatt == null || gridWatt > 0);

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

      <View
        pointerEvents="none"
        style={[styles.overlay, { left: insetX, width: visualWidth, height }]}
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
          {todayEnergy.value}
          {todayEnergy.unit ? (
            <UnscaledText
              allowFontScaling={false}
              style={{ fontSize: at(47.6) }}
            >
              {` ${todayEnergy.unit}`}
            </UnscaledText>
          ) : null}
        </UnscaledText>
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
          cx={585.5}
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
          cx={931.5}
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
