import React, { type ComponentProps } from "react";
import { Text as NativeText, View } from "react-native";
import Svg, {
  Rect,
  Circle,
  Ellipse,
  Path,
  Line,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  G,
  Text as SvgText,
} from "react-native-svg";

import {
  CHART_WIDTH,
  isRainWeatherCode,
  isStormWeatherCode,
  SCREEN_WIDTH,
  type SolarDashboardData,
} from "./SolarPlantScreen.helpers";
import { styles } from "./SolarPlantScreen.styles";

type SolarTextProps = ComponentProps<typeof NativeText>;

const Text: React.FC<SolarTextProps> = (props) => (
  <NativeText {...props} allowFontScaling={false} />
);

// ─── Weather SVG ─────────────────────────────────────────────────────────────

const WeatherStormy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    {[6, 14, 22, 30, 38, 46].map((x, i) => (
      <Line
        key={i}
        x1={x}
        y1={26 + (i % 2) * 3}
        x2={x - 4}
        y2={42}
        stroke="#7ab8e0"
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.75}
      />
    ))}
    <Ellipse cx={26} cy={16} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={14} cy={19} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={37} cy={19} rx={9} ry={6} fill="white" opacity={0.96} />
    <Polygon points="28,12 23,20 27,20 22,28 32,18 27,18" fill="#f5a623" />
  </Svg>
);

const WeatherRainy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    {[14, 24, 34].map((x, i) => (
      <Line
        key={i}
        x1={x}
        y1={28}
        x2={x - 4}
        y2={40}
        stroke="#61b9e8"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      />
    ))}
    <Ellipse cx={26} cy={17} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={14} cy={20} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={38} cy={20} rx={9} ry={6} fill="white" opacity={0.96} />
  </Svg>
);

const WeatherSunny: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    <Circle cx={27} cy={21} r={10} fill="#ffc447" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const x1 = 27 + Math.cos(rad) * 15;
      const y1 = 21 + Math.sin(rad) * 15;
      const x2 = 27 + Math.cos(rad) * 20;
      const y2 = 21 + Math.sin(rad) * 20;

      return (
        <Line
          key={angle}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ffc447"
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    })}
  </Svg>
);

const WeatherCloudy: React.FC = () => (
  <Svg width={52} height={42} viewBox="0 0 52 42">
    <Circle cx={21} cy={16} r={9} fill="#ffd56a" opacity={0.9} />
    <Ellipse cx={28} cy={22} rx={17} ry={9} fill="white" opacity={0.96} />
    <Ellipse cx={16} cy={24} rx={9} ry={6} fill="white" opacity={0.96} />
    <Ellipse cx={39} cy={24} rx={9} ry={6} fill="white" opacity={0.96} />
  </Svg>
);

export const WeatherIcon: React.FC<{ weatherCode?: number }> = ({
  weatherCode,
}) => {
  if (isStormWeatherCode(weatherCode)) {
    return <WeatherStormy />;
  }

  if (isRainWeatherCode(weatherCode)) {
    return <WeatherRainy />;
  }

  if (weatherCode != null && weatherCode >= 1 && weatherCode <= 48) {
    return <WeatherCloudy />;
  }

  return <WeatherSunny />;
};

export const DateCalendarIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 32 32">
    <Rect
      x={5}
      y={6}
      width={22}
      height={22}
      rx={2.5}
      fill="none"
      stroke="#6EA0F6"
      strokeWidth={1.8}
    />
    <Line x1={5} y1={12} x2={27} y2={12} stroke="#6EA0F6" strokeWidth={1.8} />
    <Line
      x1={11}
      y1={4}
      x2={11}
      y2={9}
      stroke="#6EA0F6"
      strokeWidth={2.1}
      strokeLinecap="round"
    />
    <Line
      x1={21}
      y1={4}
      x2={21}
      y2={9}
      stroke="#6EA0F6"
      strokeWidth={2.1}
      strokeLinecap="round"
    />
    {[11, 16, 21].map((x) =>
      [17, 22].map((y) => (
        <Rect
          key={`${x}-${y}`}
          x={x - 1.2}
          y={y - 1.2}
          width={2.4}
          height={2.4}
          fill="#6EA0F6"
        />
      ))
    )}
    <Rect x={10} y={14.8} width={2.4} height={2.4} fill="#6EA0F6" />
    <Rect x={15} y={14.8} width={2.4} height={2.4} fill="#6EA0F6" />
  </Svg>
);

export const DateChevron: React.FC<{
  direction: "left" | "right";
  muted?: boolean;
}> = ({ direction, muted }) => {
  const path =
    direction === "left" ? "M20 7 L12 16 L20 25" : "M12 7 L20 16 L12 25";
  return (
    <Svg width={22} height={24} viewBox="0 0 32 32">
      <Path
        d={path}
        fill="none"
        stroke={muted ? "#969696" : "#6EA0F6"}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export const DateSkipIcon: React.FC<{ muted?: boolean }> = ({ muted }) => (
  <Svg width={25} height={24} viewBox="0 0 34 32">
    <Path
      d="M9 7 L17 16 L9 25"
      fill="none"
      stroke={muted ? "#969696" : "#6EA0F6"}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line
      x1={23}
      y1={8}
      x2={23}
      y2={24}
      stroke={muted ? "#969696" : "#6EA0F6"}
      strokeWidth={2.4}
      strokeLinecap="round"
    />
  </Svg>
);

// ─── Factory + Tower scene ────────────────────────────────────────────────────

export const SceneView: React.FC<{ width?: number }> = ({
  width = SCREEN_WIDTH,
}) => {
  const W = width;
  const H = 145;
  const VIEW_H = 180;
  const factoryX = W * 0.17;
  const factoryY = 86;
  const factoryW = W * 0.52;
  const factoryH = 84;
  const leftWallW = factoryW * 0.48;
  const cabinetX = W * 0.46;
  const cabinetY = 126;
  const cabinetW = 28;
  const panelX = factoryX + 12;
  const panelY = 124;
  const panelCellW = W * 0.035;
  const panelRows = [0, 15, 30];
  const panelLineY = panelY + 15;
  const panelLineStartX = cabinetX - 7;
  const panelLineEndX = panelX + panelCellW * 3 + 8;
  const panelLineSegments = Array.from({ length: 8 }).map((_, i) => {
    const x1 = panelLineStartX - i * 10;
    return {
      x1,
      x2: x1 - 6,
      color: i === 2 || i === 4 ? "#f5a623" : "#12b04f",
    };
  });
  return (
    <Svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${VIEW_H}`}
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#d0e4f5" />
          <Stop offset="100%" stopColor="#afc8e0" />
        </LinearGradient>
        <LinearGradient id="roof" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#b8cfe6" />
          <Stop offset="100%" stopColor="#8faec8" />
        </LinearGradient>
      </Defs>

      {/* ── Factory body ── */}
      <Rect
        x={factoryX}
        y={factoryY}
        width={factoryW}
        height={factoryH}
        fill="#edf1f8"
      />
      <Rect
        x={factoryX}
        y={factoryY}
        width={leftWallW}
        height={factoryH}
        fill="#b9d8f5"
      />
      <Polygon
        points={`${factoryX},${factoryY} ${
          factoryX + leftWallW
        },${factoryY} ${factoryX},${factoryY + factoryH}`}
        fill="#8ebcf1"
        opacity={0.55}
      />
      <Polygon
        points={`${factoryX},${factoryY} ${factoryX + W * 0.06},${
          factoryY - 15
        } ${factoryX + leftWallW},${factoryY - 15} ${
          factoryX + leftWallW
        },${factoryY}`}
        fill="#1b2f67"
      />
      <Polygon
        points={`${factoryX + leftWallW},${factoryY} ${factoryX + W * 0.38},${
          factoryY - 15
        } ${factoryX + factoryW},${factoryY - 15} ${
          factoryX + factoryW
        },${factoryY}`}
        fill="#192b5f"
      />
      <Polygon
        points={`${factoryX + leftWallW - 10},${factoryY} ${
          factoryX + leftWallW + 26
        },${factoryY - 15} ${factoryX + leftWallW + 26},${factoryY + 22} ${
          factoryX + leftWallW
        },${factoryY + 22}`}
        fill="#f7f8ff"
      />
      <Line
        x1={factoryX}
        y1={factoryY + factoryH}
        x2={factoryX + factoryW}
        y2={factoryY + factoryH}
        stroke="#6e7f99"
        strokeWidth={2}
      />
      {/* solar panels on factory wall */}
      {panelRows.map((rowOffset) => (
        <G key={rowOffset}>
          {[0, 1, 2].map((cell) => (
            <Rect
              key={cell}
              x={panelX + cell * panelCellW}
              y={panelY + rowOffset}
              width={panelCellW - 1}
              height={10}
              rx={1}
              fill="#fde88d"
              stroke="#5f7896"
              strokeWidth={1}
            />
          ))}
        </G>
      ))}
      {/* center panel with logo (red control cabinet – arrows converge here) */}
      <Rect
        x={cabinetX}
        y={cabinetY}
        width={cabinetW}
        height={44}
        rx={2}
        fill="#eff8ff"
        stroke="#8097b2"
        strokeWidth={1.4}
      />
      <Polygon
        points={`${cabinetX + 14},140 ${cabinetX + 8},152 ${cabinetX + 22},152`}
        fill="#d94444"
      />
      {/* windows right */}
      <Rect x={W * 0.58} y={112} width={22} height={16} rx={2} fill="#ddedf8" />
      <Rect x={W * 0.64} y={112} width={22} height={16} rx={2} fill="#ddedf8" />

      {/* ── Arrows (all converge on the red control cabinet at x≈W*0.46+14, y:118-170) ── */}

      {/* down arrow: solar power → top of the cabinet */}
      {[0, 9, 18, 27, 36, 45, 54, 63].map((y) => (
        <Line
          key={y}
          x1={W * 0.46 + 14}
          y1={36 + y}
          x2={W * 0.46 + 14}
          y2={43 + y}
          stroke="#4caf50"
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
      <Polygon
        points={`${cabinetX + 14},126 ${cabinetX + 6},114 ${cabinetX + 22},114`}
        fill="#4caf50"
      />

      {/* left arrow: cabinet → solar panels, with orange energy segments */}
      {panelLineSegments.map((segment, i) => (
        <Line
          key={i}
          x1={Math.max(segment.x1, panelLineEndX)}
          y1={panelLineY}
          x2={Math.max(segment.x2, panelLineEndX)}
          y2={panelLineY}
          stroke={segment.color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ))}
      <Polygon
        points={`${panelLineEndX},${panelLineY} ${panelLineEndX + 12},${
          panelLineY - 7
        } ${panelLineEndX + 12},${panelLineY + 7}`}
        fill="#4caf50"
      />

      {/* right orange arrow: grid → cabinet, at the vertical center of the cabinet (y=140) */}
      <Line
        x1={W * 0.82}
        y1={panelLineY}
        x2={cabinetX + cabinetW}
        y2={panelLineY}
        stroke="#f5a623"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <Polygon
        points={`${cabinetX + cabinetW},${panelLineY} ${
          cabinetX + cabinetW + 11
        },${panelLineY - 6} ${cabinetX + cabinetW + 11},${panelLineY + 6}`}
        fill="#f5a623"
      />

      {/* ── Electric tower ── */}
      <Line
        x1={W * 0.87}
        y1={88}
        x2={W * 0.8}
        y2={168}
        stroke="#9ab0c4"
        strokeWidth={2}
      />
      <Line
        x1={W * 0.87}
        y1={88}
        x2={W * 0.94}
        y2={168}
        stroke="#9ab0c4"
        strokeWidth={2}
      />
      <Line
        x1={W * 0.81}
        y1={110}
        x2={W * 0.93}
        y2={110}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.8}
        y1={128}
        x2={W * 0.94}
        y2={128}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.78}
        y1={148}
        x2={W * 0.96}
        y2={148}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Line
        x1={W * 0.82}
        y1={98}
        x2={W * 0.92}
        y2={98}
        stroke="#9ab0c4"
        strokeWidth={1.5}
      />
      <Circle cx={W * 0.82} cy={98} r={2} fill="#7a9ab0" />
      <Circle cx={W * 0.92} cy={98} r={2} fill="#7a9ab0" />

      {/* ── Trees ── */}
      {[W * 0.04, W * 0.09, W * 0.15, W * 0.2, W * 0.74, W * 0.78].map(
        (x, i) => {
          const h = 22 + (i % 3) * 8;
          return (
            <Rect
              key={i}
              x={x - 5}
              y={170 - h}
              width={10}
              height={h}
              rx={5}
              fill={i % 2 === 0 ? "#4aaa5a" : "#5aba68"}
              opacity={0.9}
            />
          );
        }
      )}
    </Svg>
  );
};

// ─── Stat Bubble ─────────────────────────────────────────────────────────────

export const StatBubble: React.FC<{
  value: string;
  unit: string;
  label?: string;
  size: number;
  borderColor: string;
  borderWidth: number;
  valueSize?: number;
}> = ({
  value,
  unit,
  label,
  size,
  borderColor,
  borderWidth,
  valueSize = 24,
}) => (
  <View
    style={[
      styles.bubble,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        borderColor,
        borderWidth,
      },
    ]}
  >
    <View style={styles.bubbleValueRow}>
      <Text
        adjustsFontSizeToFit
        allowFontScaling={false}
        minimumFontScale={0.72}
        numberOfLines={1}
        style={[styles.bubbleValue, { fontSize: valueSize }]}
      >
        {value}
      </Text>
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.bubbleUnit}
      >
        {unit}
      </Text>
    </View>
    {label ? (
      <Text
        allowFontScaling={false}
        numberOfLines={2}
        style={styles.bubbleLabel}
      >
        {label}
      </Text>
    ) : null}
  </View>
);

// ─── Donut chart ──────────────────────────────────────────────────────────────

export const DonutChart: React.FC<{
  primaryColor: string;
  secondaryColor: string;
  primaryPct: number;
  size?: number;
}> = ({ primaryColor, secondaryColor, primaryPct, size = 80 }) => {
  const r = (size - 14) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const strokeW = 10;
  const circ = 2 * Math.PI * r;
  const primary = (primaryPct / 100) * circ;
  const secondary = circ - primary;
  return (
    <Svg width={size} height={size}>
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={secondaryColor}
        strokeWidth={strokeW}
        fill="none"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={primaryColor}
        strokeWidth={strokeW}
        fill="none"
        strokeDasharray={`${primary} ${secondary}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
      />
    </Svg>
  );
};

// ─── Area chart (Production & Consumption) ───────────────────────────────────

export const AreaChart: React.FC<{
  productionData: number[];
  consumptionData: number[];
  variant?: "merged" | "production" | "consumption";
  markerIndex?: number;
  tooltipValue?: number;
  showReferenceLine?: boolean;
  width?: number;
  height?: number;
}> = ({
  productionData,
  consumptionData,
  variant = "merged",
  markerIndex = 8,
  tooltipValue,
  showReferenceLine = false,
  width = CHART_WIDTH,
  height = 180,
}) => {
  const padL = 32;
  const padR = 8;
  const padT = 16;
  const padB = 28;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const max = Math.max(...productionData, ...consumptionData, 1.6);
  const N = productionData.length;
  const isMerged = variant === "merged";
  const isProduction = variant === "production";
  const markerValue =
    tooltipValue ??
    (isProduction ? productionData[markerIndex] : consumptionData[markerIndex]);

  const px = (i: number) => padL + (i / (N - 1)) * W;
  const py = (v: number) => padT + H - (v / max) * H;
  const endIndex = markerIndex;
  const getSeriesValue = (
    dataSet: number[],
    index: number,
    isActive: boolean
  ) => (isActive && index === markerIndex ? markerValue : dataSet[index]);
  const linePath = (dataSet: number[], isActive = false) =>
    dataSet
      .slice(0, endIndex + 1)
      .map((_, i) => {
        const value = getSeriesValue(dataSet, i, isActive);
        return `${i === 0 ? "M" : "L"}${px(i)},${py(value)}`;
      })
      .join(" ");
  const areaPath = (dataSet: number[], isActive = false) =>
    `${linePath(dataSet, isActive)} L${px(endIndex)},${padT + H} L${px(0)},${
      padT + H
    } Z`;

  const prodPath = areaPath(productionData, isProduction || isMerged);
  const conPath = areaPath(consumptionData, variant === "consumption");

  const yTicks = [0, 0.4, 0.8, 1.2, 1.6];
  const xLabels = [
    { label: "6", idx: 6 },
    { label: "Noon", idx: 12 },
    { label: "18", idx: 18 },
  ];

  return (
    <Svg width={width} height={height}>
      {/* grid lines */}
      {yTicks.map((v) => (
        <G key={v}>
          <Line
            x1={padL}
            y1={py(v)}
            x2={padL + W}
            y2={py(v)}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
          <SvgText
            x={padL - 4}
            y={py(v) + 4}
            fontSize={9}
            fill="#aaa"
            textAnchor="end"
          >
            {v}
          </SvgText>
        </G>
      ))}
      {showReferenceLine ? (
        <>
          <Line
            x1={padL}
            y1={py(isProduction ? 0.68 : 1.55)}
            x2={padL + W}
            y2={py(isProduction ? 0.68 : 1.55)}
            stroke="#8a8a8a"
            strokeWidth={1}
            strokeDasharray="6 7"
          />
          <SvgText
            x={padL + 2}
            y={py(isProduction ? 0.68 : 1.55) + 4}
            fontSize={11}
            fontWeight="600"
            fill="#777"
          >
            -Yesterday's high-
          </SvgText>
        </>
      ) : null}
      {isMerged || variant === "consumption" ? (
        <>
          <Path d={conPath} fill={isMerged ? "#ff8a3040" : "#ff8a304f"} />
          <Path
            d={linePath(consumptionData, variant === "consumption")}
            fill="none"
            stroke="#ff9800"
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {isMerged || isProduction ? (
        <>
          <Path d={prodPath} fill={isMerged ? "#2e86de78" : "#13c96045"} />
          <Path
            d={linePath(productionData, isProduction || isMerged)}
            fill="none"
            stroke={isMerged ? "#1684ff" : "#04b850"}
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {variant === "consumption" ? (
        <>
          <Path d={prodPath} fill="#2e86de78" />
          <Path
            d={linePath(productionData)}
            fill="none"
            stroke="#2e86de"
            strokeWidth={1.5}
          />
        </>
      ) : null}
      {/* x axis */}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#ccc"
        strokeWidth={1}
      />
      {xLabels.map(({ label, idx }) => (
        <SvgText
          key={label}
          x={px(idx)}
          y={padT + H + 14}
          fontSize={10}
          fill="#999"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}
      <SvgText x={padL - 2} y={padT + H + 14} fontSize={9} fill="#aaa">
        MW
      </SvgText>
      <Line
        x1={px(markerIndex)}
        y1={padT}
        x2={px(markerIndex)}
        y2={padT + H}
        stroke="#333"
        strokeWidth={2}
      />
      <Circle
        cx={px(markerIndex)}
        cy={py(markerValue)}
        r={5}
        fill="white"
        stroke={isProduction || isMerged ? "#04b850" : "#333"}
        strokeWidth={2}
      />
    </Svg>
  );
};

// ─── Bar chart (Comparative Production) ──────────────────────────────────────

export const BarChart: React.FC<{
  data: SolarDashboardData["comparativeData"];
  width?: number;
  height?: number;
}> = ({ data, width = CHART_WIDTH, height = 180 }) => {
  const padL = 40;
  const padR = 8;
  const padT = 16;
  const padB = 32;
  const W = width - padL - padR;
  const H = height - padT - padB;
  const max = Math.max(...data.flatMap((d) => [d.year2025, d.year2026]), 120);
  const barW = (W / data.length) * 0.35;
  const yTicks = [30, 60, 90, 120];

  return (
    <Svg width={width} height={height}>
      {yTicks.map((v) => {
        const y = padT + H - (v / max) * H;
        return (
          <G key={v}>
            <Line
              x1={padL}
              y1={y}
              x2={padL + W}
              y2={y}
              stroke="#e8e8e8"
              strokeWidth={0.8}
            />
            <SvgText
              x={padL - 4}
              y={y + 4}
              fontSize={9}
              fill="#bbb"
              textAnchor="end"
            >
              {v}
            </SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const cx = padL + (i + 0.5) * (W / data.length);
        const y25 = padT + H - (d.year2025 / max) * H;
        const y26 = padT + H - (d.year2026 / max) * H;
        return (
          <G key={d.month}>
            {d.year2025 > 0 && (
              <Rect
                x={cx - barW - 1}
                y={y25}
                width={barW}
                height={padT + H - y25}
                rx={2}
                fill="#42b0e8"
              />
            )}
            {d.year2026 > 0 && (
              <Rect
                x={cx + 1}
                y={y26}
                width={barW}
                height={padT + H - y26}
                rx={2}
                fill="#4e5ab5"
              />
            )}
            <SvgText
              x={cx}
              y={padT + H + 18}
              fontSize={9}
              fill="#aaa"
              textAnchor="middle"
            >
              {d.month}
            </SvgText>
          </G>
        );
      })}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#ddd"
        strokeWidth={1}
      />
      <SvgText
        x={padL - 8}
        y={padT + H + 8}
        fontSize={9}
        fill="#9fb0c8"
        textAnchor="end"
      >
        MWh
      </SvgText>
    </Svg>
  );
};
