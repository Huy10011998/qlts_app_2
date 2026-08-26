import { useAppColors, useStyles } from "../../utils/helpers/colors";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
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
  COMPARE_CURRENT_YEAR_COLOR,
  COMPARE_PREVIOUS_YEAR_COLOR,
  formatVnNumber,
  isRainWeatherCode,
  isStormWeatherCode,
  roundTo,
  SCREEN_WIDTH,
  type EnergyBarBucket,
  type SolarComparativeBucket,
} from "./SolarPlantScreen.helpers";
import { makeStyles } from "./SolarPlantScreen.styles";
import type { PlantScene } from "./shared/plantScenes";
import {
  UnscaledText,
  getTextScaleFactor,
  scaledSvgFontSize,
} from "../../utils/helpers/textScaling";

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
      )),
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

/**
 * Khung cảnh nhà máy cao theo chiều rộng, tỉ lệ lấy từ điện thoại (390 × 145) —
 * nơi bố cục này được canh. Trước đây chiều cao cắm cứng 145: trên tablet khối
 * rộng tới `MAX_SOLAR_CONTENT_WIDTH` (720) nên dải ảnh dẹt gần 5:1, `cover` cắt
 * mất phần lớn nhà máy còn các lớp SVG đè lên bị kéo ngang mà không kéo dọc.
 * Chặn trên để trên máy màn rộng khối hero không phình quá.
 */
/**
 * Bật/tắt sơ đồ dòng năng lượng vẽ đè lên ảnh nhà máy: tấm pin ở tường, tủ
 * điện, ba mũi tên và cột điện lưới. Tắt thì khung cảnh chỉ còn ảnh nhà máy với
 * dàn pin trên mái, phần số liệu do ba bong bóng phía trên đảm nhiệm.
 */
const SHOW_ENERGY_FLOW = false;

/** Nhóm SVG có thể chạy animation opacity – dùng cho vệt nắng quét trên dàn pin. */
const AnimatedG = Animated.createAnimatedComponent(G);

const SCENE_HEIGHT_RATIO = 145 / 390;
const SCENE_MIN_HEIGHT = 145;
const SCENE_MAX_HEIGHT = 230;

export const getSceneHeight = (width: number) =>
  Math.round(
    Math.min(
      Math.max(width * SCENE_HEIGHT_RATIO, SCENE_MIN_HEIGHT),
      SCENE_MAX_HEIGHT,
    ),
  );

/**
 * Khoảng chừa phía trên khung cảnh cho ba bong bóng số liệu — giữ đúng khoảng hở
 * của bản điện thoại (hero 226 − cảnh 145).
 */
export const SCENE_TOP_SPACE = 81;

export const SceneView: React.FC<{
  /**
   * Ảnh nhà máy thật (kèm toạ độ dàn pin trên mái), thay cho hình nhà xưởng vẽ
   * bằng SVG. Các lớp còn lại (tủ điện, 3 mũi tên, cột điện) vẫn vẽ đè lên trên
   * vì chúng biểu diễn dòng năng lượng chứ không phải trang trí.
   */
  plantScene?: PlantScene | null;
  width?: number;
}> = ({ plantScene, width = SCREEN_WIDTH }) => {
  const styles = useStyles(makeStyles);
  const plantImage: ImageSourcePropType | null = plantScene?.image ?? null;
  const W = width;
  const H = getSceneHeight(W);
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
  const panelW = panelCellW * 3;
  const panelH = 11;
  // Độ lệch cạnh trên so với cạnh dưới của tấm pin (góc nghiêng giả 3D).
  const panelSkew = 7;
  const panelRows = [0, 15, 30];

  /**
   * Dàn pin thật nằm trên mái nhà máy trong ảnh. Quy toạ độ đo trên ảnh gốc về
   * hệ toạ độ của `viewBox` để lớp highlight trùm đúng lên dàn pin: ảnh đang
   * `cover` nên phải trừ phần bị cắt, còn viewBox lại cao 180 trong khi khung
   * chỉ cao H.
   */
  const roofs = useMemo(() => {
    if (!plantScene) return null;

    const { height: imgH, width: imgW } = plantScene.imageSize;
    const coverScale = Math.max(W / imgW, H / imgH);
    const drawnW = imgW * coverScale;
    const drawnH = imgH * coverScale;
    const offsetX = (W - drawnW) / 2;
    const offsetY = (H - drawnH) / 2;
    const toViewY = VIEW_H / H;

    return plantScene.panelZones.map((zone) => {
      const corners = zone.corners.map(([u, v]) => ({
        x: offsetX + u * drawnW,
        y: (offsetY + v * drawnH) * toViewY,
      }));
      const [tl, tr, br, bl] = corners;
      // Nội suy song tuyến tính trong tứ giác -> lưới vẽ đè tự bám theo góc phối
      // cảnh của mái, không cần biết trước độ nghiêng.
      const at = (sx: number, ty: number) => {
        const topX = tl.x + (tr.x - tl.x) * sx;
        const topY = tl.y + (tr.y - tl.y) * sx;
        const botX = bl.x + (br.x - bl.x) * sx;
        const botY = bl.y + (br.y - bl.y) * sx;
        return { x: topX + (botX - topX) * ty, y: topY + (botY - topY) * ty };
      };
      const points = (quad: { x: number; y: number }[]) =>
        quad.map((pt) => `${pt.x},${pt.y}`).join(" ");
      const cx = (tl.x + tr.x + br.x + bl.x) / 4;
      const cy = (tl.y + tr.y + br.y + bl.y) / 4;
      // Viền sáng thu vào trong vài phần trăm để chắc chắn nằm trên mặt pin, lệch
      // ra ngoài mái là thấy ngay.
      const frame = corners.map((pt) => ({
        x: cx + (pt.x - cx) * 0.975,
        y: cy + (pt.y - cy) * 0.975,
      }));

      return {
        at,
        bottomLeft: bl,
        cols: zone.cols,
        framePoints: points(frame),
        points,
        rows: zone.rows,
        zonePoints: points([tl, tr, br, bl]),
      };
    });
  }, [H, W, plantScene]);

  /** Mái chính – nhãn và mũi tên xanh neo theo mái này. */
  const roof = roofs?.[0] ?? null;

  /** Vệt nắng quét qua dàn pin – dấu hiệu "đang phát điện". */
  const glare = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!roofs) return;

    const loop = Animated.loop(
      Animated.timing(glare, {
        duration: 3400,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: false,
      }),
    );

    loop.start();

    return () => loop.stop();
  }, [glare, roofs]);

  const panelLineY = panelY + 15;
  const panelLineStartX = cabinetX - 7;
  const panelLineEndX = panelX + panelCellW * 3 + 8;
  const panelArrowBaseX = panelLineEndX + 12;
  const downArrowBaseY = 114;
  const downArrowTipY = 126;
  const downArrowX = W * 0.46 + 14;
  /**
   * Có ảnh: mũi tên xanh xuất phát ngay dưới mép dàn pin trên mái, để thấy rõ
   * điện chạy từ dàn pin xuống tủ điện. Không có ảnh: giữ nguyên mốc cũ.
   */
  const downArrowStartY = (() => {
    if (!roof) return 36;

    const bottom = [roof.at(0, 1), roof.at(1, 1)];
    const span = bottom[1].x - bottom[0].x;
    const ratio = span === 0 ? 0 : (downArrowX - bottom[0].x) / span;

    if (ratio < 0 || ratio > 1) return 36;

    const edgeY = bottom[0].y + (bottom[1].y - bottom[0].y) * ratio;

    return Math.min(Math.max(edgeY + 5, 30), downArrowBaseY - 20);
  })();
  const downArrowSegments = Array.from(
    { length: Math.max(Math.floor((downArrowBaseY - downArrowStartY) / 9), 2) },
    (_, i) => downArrowStartY + i * 9,
  );
  const panelLineSegmentCount = Math.ceil(
    (panelLineStartX - panelArrowBaseX) / 10,
  );
  const panelLineSegments = Array.from(
    { length: panelLineSegmentCount },
    (_, i) => {
      // Anchor the first segment at the arrowhead base. Building the dashes
      // from the cabinet side can leave the first visible segment a few
      // pixels away from the arrowhead after tablet Display Zoom rounding.
      const x2 = panelArrowBaseX + i * 10;
      return {
        x1: Math.min(x2 + 6, panelLineStartX),
        x2,
        color: i === 2 || i === 4 ? "#f5a623" : "#12b04f",
      };
    },
  ).filter((segment) => segment.x1 > segment.x2);

  /**
   * Nhãn "PIN MẶT TRỜI" neo dưới góc trái dàn pin, nhưng phải dừng trước tủ
   * điện – ở Vĩnh Lộc dàn pin phủ gần giữa ảnh nên hai thứ đè nhau.
   */
  const badgeX = roof
    ? Math.min(Math.max(roof.bottomLeft.x, 4), W - 84, cabinetX - 84)
    : 0;

  const scene = (
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
        {/* Kính tấm pin: xanh đậm chuyển sáng theo hướng nghiêng để nhìn ra
            ngay là pin mặt trời, không còn là ô vuông vàng phẳng. */}
        <LinearGradient id="pvGlass" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#2f6fd0" />
          <Stop offset="45%" stopColor="#1b3b8f" />
          <Stop offset="100%" stopColor="#0d1f4d" />
        </LinearGradient>
        {/* Vệt nắng loá chạy chéo trên mặt kính. */}
        <LinearGradient id="pvGlare" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {/* ── Factory body ──
          Bỏ hẳn khi có ảnh nhà máy thật: ảnh nằm dưới SVG này và chính là
          nền của khối, vẽ thêm nhà xưởng lên trên nữa thì chồng hai cái. */}
      {plantImage ? null : (
        <G>
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
            points={`${factoryX + leftWallW},${factoryY} ${
              factoryX + W * 0.38
            },${factoryY - 15} ${factoryX + factoryW},${factoryY - 15} ${
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
        </G>
      )}

      {/* ── Dàn pin mặt trời ──
          Có ảnh nhà máy: dàn pin thật đã nằm trên mái trong ảnh, nên lớp vẽ đè
          bám theo đúng tứ giác mái đó (làm sâu mặt kính + lưới module + viền
          phát sáng + vệt nắng quét) để nhìn vào là biết ngay đâu là dàn pin.
          Không có ảnh: vẽ tấm pin nghiêng trên tường nhà xưởng như cũ. */}
      {roofs?.map((zone, zoneIndex) => (
        <G key={zoneIndex}>
          {/* làm sâu màu mặt kính để dàn pin bật khỏi mái sáng */}
          <Polygon points={zone.zonePoints} fill="#0a1f4d" opacity={0.34} />
          <Polygon
            points={zone.zonePoints}
            fill="url(#pvGlass)"
            opacity={0.3}
          />

          {/* lưới module trùng nhịp với dàn pin trong ảnh */}
          {Array.from({ length: zone.cols - 1 }, (_, i) => {
            const sx = (i + 1) / zone.cols;
            const a = zone.at(sx, 0);
            const b = zone.at(sx, 1);
            return (
              <Line
                key={`c${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#d8ecff"
                strokeWidth={0.7}
                opacity={0.45}
              />
            );
          })}
          {Array.from({ length: zone.rows - 1 }, (_, i) => {
            const ty = (i + 1) / zone.rows;
            const a = zone.at(0, ty);
            const b = zone.at(1, ty);
            return (
              <Line
                key={`r${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#d8ecff"
                strokeWidth={0.7}
                opacity={0.4}
              />
            );
          })}

          {/* Hiệu ứng sáng duyệt qua từng hàng tấm pin, từ hàng dưới lên hàng
              trên. Mỗi vệt trùng đúng một hàng module của lưới (chừa mép để
              thấy đường viền giữa các tấm) nên nhìn ra là đang "chạy" qua từng
              tấm, chứ không phải một dải sáng trôi qua. */}
          {Array.from({ length: zone.rows }, (_, i) => {
            const rowGap = 0.12 / zone.rows;
            const t0 = i / zone.rows + rowGap;
            const t1 = (i + 1) / zone.rows - rowGap;
            // Hàng dưới cùng sáng trước -> chạy ngược lên trên.
            const peak = 0.12 + ((zone.rows - 1 - i) / zone.rows) * 0.72;
            return (
              <AnimatedG
                key={`g${i}`}
                opacity={glare.interpolate({
                  inputRange: [
                    0,
                    Math.max(peak - 0.1, 0.001),
                    peak,
                    Math.min(peak + 0.1, 0.999),
                    1,
                  ],
                  outputRange: [0, 0, 0.45, 0, 0],
                })}
              >
                <Polygon
                  points={zone.points([
                    zone.at(0, t0),
                    zone.at(1, t0),
                    zone.at(1, t1),
                    zone.at(0, t1),
                  ])}
                  fill="#ffffff"
                />
              </AnimatedG>
            );
          })}

          {/* viền phát sáng khoanh vùng dàn pin */}
          <Polygon
            points={zone.framePoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={5}
            strokeLinejoin="round"
            opacity={0.24}
          />
          <Polygon
            points={zone.framePoints}
            fill="none"
            stroke="#d6efff"
            strokeWidth={1.8}
            strokeLinejoin="round"
            opacity={0.95}
          />
        </G>
      ))}

      {/* nhãn dưới góc mái chính, khỏi phải đoán đó là cái gì */}
      {roof ? (
        <G>
          <Rect
            x={badgeX}
            y={roof.bottomLeft.y + 4}
            width={80}
            height={15}
            rx={7.5}
            fill="#0b2545"
            opacity={0.85}
          />
          <Circle
            cx={badgeX + 10}
            cy={roof.bottomLeft.y + 11.5}
            r={3.4}
            fill="#ffd35c"
          />
          <SvgText
            x={badgeX + 18}
            y={roof.bottomLeft.y + 15}
            fill="#eaf5ff"
            fontSize={8.5}
            fontWeight="700"
          >
            PIN MẶT TRỜI
          </SvgText>
        </G>
      ) : null}

      {/* Sơ đồ dòng năng lượng: 3 tấm pin vẽ ở tường nhà xưởng, tủ điện, ba
          mũi tên nối vào tủ và cột điện lưới. Đang tắt theo yêu cầu hiển thị –
          màn chỉ giữ dàn pin trên mái với ba bong bóng số liệu. Bật lại bằng
          cách đổi SHOW_ENERGY_FLOW thành true. */}
      {SHOW_ENERGY_FLOW ? (
        <G>
        {/* ── Tấm pin vẽ trên tường nhà xưởng ──
            Giữ cả khi có ảnh: đây là đích của mũi tên xanh–cam, bỏ đi thì mũi tên
            trỏ vào khoảng không. */}
        <G>
          {panelRows.map((rowOffset) => {
            const y = panelY + rowOffset;
            const yb = y + panelH;
            const x0 = panelX;
            const x1 = panelX + panelW;
            // Cạnh trên lệch phải so với cạnh dưới -> cảm giác mặt kính đang ngửa
            // lên trời.
            const t0 = x0 + panelSkew;
            const t1 = x1 + panelSkew;
            const quad = `${t0},${y} ${t1},${y} ${x1},${yb} ${x0},${yb}`;
            return (
              <G key={rowOffset}>
                {/* bóng đổ mỏng cho tấm nổi khỏi ảnh nhà máy phía sau */}
                <Polygon
                  points={`${t0},${y + 2.5} ${t1},${y + 2.5} ${x1},${
                    yb + 2.5
                  } ${x0},${yb + 2.5}`}
                  fill="#0b1a3a"
                  opacity={0.22}
                />
                <Polygon
                  points={quad}
                  fill="url(#pvGlass)"
                  stroke="#e8f1fb"
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                />
                {/* lưới cell: 2 đường dọc chia 3 module + 1 đường ngang giữa */}
                {[1, 2].map((i) => {
                  const bx = x0 + (panelW * i) / 3;
                  return (
                    <Line
                      key={i}
                      x1={bx + panelSkew}
                      y1={y}
                      x2={bx}
                      y2={yb}
                      stroke="#cfe0f5"
                      strokeWidth={0.9}
                      opacity={0.85}
                    />
                  );
                })}
                <Line
                  x1={x0 + panelSkew / 2}
                  y1={y + panelH / 2}
                  x2={x1 + panelSkew / 2}
                  y2={y + panelH / 2}
                  stroke="#cfe0f5"
                  strokeWidth={0.9}
                  opacity={0.7}
                />
                {/* vệt nắng loá phủ nửa trên mặt kính */}
                <Polygon
                  points={`${t0},${y} ${t1},${y} ${x1 + panelSkew / 2},${
                    y + panelH / 2
                  } ${x0 + panelSkew / 2},${y + panelH / 2}`}
                  fill="url(#pvGlare)"
                />
                {/* chân đỡ tấm pin */}
                <Line
                  x1={x0 + panelW * 0.18}
                  y1={yb}
                  x2={x0 + panelW * 0.18}
                  y2={yb + 3.5}
                  stroke="#8ea6c2"
                  strokeWidth={1.6}
                />
                <Line
                  x1={x0 + panelW * 0.82}
                  y1={yb}
                  x2={x0 + panelW * 0.82}
                  y2={yb + 3.5}
                  stroke="#8ea6c2"
                  strokeWidth={1.6}
                />
              </G>
            );
          })}
          {/* tia nắng chớp ở góc tấm trên cùng – điểm nhấn "đang phát điện" */}
          <G>
            <Circle
              cx={panelX + panelW + panelSkew - 7}
              cy={panelY + 1}
              r={4.5}
              fill="#ffe08a"
              opacity={0.55}
            />
            <Circle
              cx={panelX + panelW + panelSkew - 7}
              cy={panelY + 1}
              r={2}
              fill="#fff8e1"
            />
          </G>
        </G>
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
        {/* <Rect x={W * 0.58} y={112} width={22} height={16} rx={2} fill="#ddedf8" />
        <Rect x={W * 0.64} y={112} width={22} height={16} rx={2} fill="#ddedf8" /> */}

        {/* ── Arrows (all converge on the red control cabinet at x≈W*0.46+14, y:118-170) ── */}

        {/* down arrow: solar power → top of the cabinet */}
        {downArrowSegments.map((y) => (
          <Line
            key={y}
            x1={W * 0.46 + 14}
            y1={y}
            x2={W * 0.46 + 14}
            y2={y + 7}
            stroke="#4caf50"
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        <Polygon
          points={`${cabinetX + 14},${downArrowTipY} ${
            cabinetX + 6
          },${downArrowBaseY} ${cabinetX + 22},${downArrowBaseY}`}
          fill="#4caf50"
        />

        {/* left arrow: cabinet → solar panels, with orange energy segments */}
        {panelLineSegments.map((segment, i) => (
          <Line
            key={i}
            x1={segment.x1}
            y1={panelLineY}
            x2={segment.x2}
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
        </G>
      ) : null}
    </Svg>
  );

  if (!plantImage) return scene;

  /**
   * Ảnh trải hết khối chứ không bó vào đúng khung nhà xưởng cũ: bó lại thì ảnh
   * chỉ còn ~200×80 nên chi tiết nhà máy nhỏ đến mức không nhìn ra gì.
   */
  const photoRect = { height: H, left: 0, top: 0, width: W };

  return (
    <View style={[styles.scenePhotoWrap, { height: H, width: W }]}>
      {/* `cover` để ảnh không bị bóp méo: khung là dải ngang dẹt còn ảnh nhà máy
          gần vuông đôi — thà cắt trên dưới. */}
      <Image
        resizeMode="cover"
        source={plantImage}
        style={[styles.scenePhoto, photoRect]}
      />
      {/* Lớp trắng mỏng: tấm pin và mũi tên vẽ đè lên ảnh chụp thật, không có
          lớp này thì chúng chìm vào chỗ ảnh nhiều chi tiết. */}
      <View style={[styles.scenePhotoScrim, photoRect]} />
      {scene}
    </View>
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
}) => {
  const styles = useStyles(makeStyles);

  return (
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
        <UnscaledText
          adjustsFontSizeToFit
          allowFontScaling={false}
          minimumFontScale={0.72}
          numberOfLines={1}
          style={[styles.bubbleValue, { fontSize: valueSize }]}
        >
          {value}
        </UnscaledText>
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={1}
          style={styles.bubbleUnit}
        >
          {unit}
        </UnscaledText>
      </View>
      {label ? (
        <UnscaledText
          allowFontScaling={false}
          numberOfLines={2}
          style={styles.bubbleLabel}
        >
          {label}
        </UnscaledText>
      ) : null}
    </View>
  );
};

// ─── Chuyển cảnh dùng chung cho biểu đồ ──────────────────────────────────────

/** Thời lượng chung cho mọi chuyển cảnh của biểu đồ, để cả màn cùng một nhịp. */
const CHART_TRANSITION_MS = 340;

/**
 * Mờ dần + nhấc nhẹ mỗi khi biểu đồ đổi sang bộ dữ liệu khác (đổi kỳ, đổi ngày,
 * đổi kiểu biểu đồ). Không có bước này thì path SVG bị thay tức thì, mắt đọc ra
 * là "nhảy" chứ không phải "đổi".
 *
 * `animationKey` chỉ nên chứa những gì người dùng CHỦ ĐỘNG đổi — không đưa giá
 * trị dữ liệu vào, không thì mỗi lượt tự tải lại 5 phút biểu đồ lại chớp một cái
 * dù số gần như y nguyên.
 */
export const ChartTransition: React.FC<{
  animationKey: string;
  children: React.ReactNode;
}> = ({ animationKey, children }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: CHART_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [animationKey, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [10, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Khung chờ của biểu đồ: giữ ĐÚNG chiều cao mà biểu đồ sẽ chiếm, nên lúc dữ liệu
 * về không có cú đẩy trang xuống. Vẽ sẵn lưới trục mờ để người dùng nhận ra "chỗ
 * này là biểu đồ" thay vì một dòng chữ trơ.
 */
export const ChartSkeleton: React.FC<{
  height: number;
  /** Đang tải thì hiện vòng xoay; đứng im với `message` khi thật sự không có dữ liệu. */
  isLoading?: boolean;
  message: string;
  width: number;
}> = ({ height, isLoading, message, width }) => {
  const styles = useStyles(makeStyles);
  const colors = useAppColors();
  const gridRowCount = 5;
  const axisY = height - 28;

  return (
    <View style={[styles.chartSkeleton, { height, width }]}>
      <Svg width={width} height={height}>
        {Array.from({ length: gridRowCount }, (_, row) => {
          const y = 16 + ((axisY - 16) / (gridRowCount - 1)) * row;

          return (
            <Line
              key={row}
              x1={40}
              y1={y}
              x2={width - 8}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth={0.8}
            />
          );
        })}
        <Line
          x1={40}
          y1={axisY}
          x2={width - 8}
          y2={axisY}
          stroke="#ccc"
          strokeWidth={1}
        />
      </Svg>
      {/* Đang tải: vòng xoay, không chữ — đổi kỳ (Tuần này/Tháng này) chỉ mất
          một nhịp ngắn, một dòng chữ hiện rồi tắt ngay đọc như nhấp nháy. */}
      {isLoading ? (
        <ActivityIndicator
          color={colors.textMuted}
          size="small"
          style={styles.chartSkeletonSpinner}
        />
      ) : (
        <UnscaledText allowFontScaling={false} style={styles.chartSkeletonText}>
          {message}
        </UnscaledText>
      )}
    </View>
  );
};

// ─── Thanh tỉ trọng (Cân bằng năng lượng) ────────────────────────────────────

const AnimatedBarSegment: React.FC<{
  fillStyle: StyleProp<ViewStyle>;
  /** Phần chiếm của đoạn này trong thanh, 0..1. */
  share: number;
}> = ({ fillStyle, share }) => {
  const styles = useStyles(makeStyles);
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Chiều rộng % không chạy được trên native driver, nhưng đây là 2 view mỗi
    // thanh nên không đáng lo.
    const animation = Animated.timing(grow, {
      toValue: share,
      duration: CHART_TRANSITION_MS + 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [grow, share]);

  return (
    <Animated.View
      style={[
        styles.barFill,
        fillStyle,
        {
          width: grow.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        },
      ]}
    />
  );
};

/**
 * Thanh tỉ trọng hai đoạn. Trước đây hai đoạn dùng `flex` theo phần trăm nên
 * chúng luôn phủ kín thanh; giữ đúng cách chia đó bằng cách quy về tỉ lệ trên
 * tổng hai phần.
 */
export const BalanceBar: React.FC<{
  segments: { fillStyle: StyleProp<ViewStyle>; percent?: number | null }[];
}> = ({ segments }) => {
  const styles = useStyles(makeStyles);
  const shares = segments.map((segment) => Math.max(segment.percent ?? 0, 0));
  const total = shares.reduce((sum, share) => sum + share, 0);

  return (
    <View style={styles.barTrack}>
      {segments.map((segment, index) => (
        <AnimatedBarSegment
          key={index}
          fillStyle={segment.fillStyle}
          share={total > 0 ? shares[index] / total : 0}
        />
      ))}
    </View>
  );
};

// ─── Donut chart ──────────────────────────────────────────────────────────────

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DonutChartBase: React.FC<{
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
  // Cung được vẽ bằng dashoffset (dashArray cố định) để chạy được animation;
  // điểm bắt đầu đưa về 12 giờ bằng rotation thay cho offset 1/4 vòng như trước.
  const primary = (Math.min(Math.max(primaryPct, 0), 100) / 100) * circ;
  const dashOffset = useRef(new Animated.Value(circ)).current;

  useEffect(() => {
    const animation = Animated.timing(dashOffset, {
      toValue: circ - primary,
      duration: CHART_TRANSITION_MS + 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });

    animation.start();
    return () => animation.stop();
  }, [circ, dashOffset, primary]);

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
      <G rotation={-90} originX={cx} originY={cy}>
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={r}
          stroke={primaryColor}
          strokeWidth={strokeW}
          fill="none"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

export const DonutChart = React.memo(DonutChartBase);

// ─── Thang đo dùng chung cho 2 biểu đồ ───────────────────────────────────────

/**
 * Mốc trục Y "tròn số" suy ra từ giá trị lớn nhất thật của dữ liệu. Không thể
 * cố định mốc như bản mock: công suất một nhà máy có thể là vài trăm kW, mốc
 * cứng sẽ vô nghĩa hoặc cắt mất đỉnh biểu đồ.
 */
/**
 * Bước tròn mặc định: chỉ 1 - 5 - 10 (nhân lũy thừa 10) và nhắm 3 khoảng, để mốc
 * rơi vào dãy 0,5 - 1 - 1,5 như thiết kế thay vì 0,2 - 0,4 - 0,6 - 0,8.
 */
const NICE_STEP_CANDIDATES = [0.5, 1, 5, 10];

const buildNiceTicks = (
  maxValue: number,
  tickCount = 3,
  candidates = NICE_STEP_CANDIDATES,
) => {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [0, 1];

  const rawStep = maxValue / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const chosen = candidates.findIndex((candidate) => normalized <= candidate);
  let niceStep =
    candidates[chosen < 0 ? candidates.length - 1 : chosen] * magnitude;

  // Bước quá to thì cả trục chỉ còn một khoảng (đỉnh 4,9 mà bước 5 -> chỉ có
  // mốc 0 và 5), lùi một nấc để vẫn còn đường kẻ ở giữa.
  if (maxValue / niceStep <= 1 && chosen > 0) {
    niceStep = candidates[chosen - 1] * magnitude;
  }

  // Mốc cuối phải >= đỉnh dữ liệu, nếu không thang đo cắt mất phần trên biểu đồ
  // (ví dụ đỉnh 0,50 với bước 0,2 phải lên tới 0,6 chứ không dừng ở 0,4).
  const stepCount = Math.max(Math.ceil(roundTo(maxValue / niceStep, 6)), 1);

  const ticks: number[] = [];
  for (let index = 0; index <= stepCount; index += 1) {
    ticks.push(roundTo(index * niceStep, 6));
  }

  return ticks;
};

/** Số lẻ của nhãn trục: bước nhỏ thì cần thêm chữ số mới phân biệt được mốc. */
const tickDigits = (step: number) => {
  if (step >= 10) return 0;
  if (step >= 1) return 1;
  return 2;
};

/**
 * Nhãn trục Y. Cắt số 0 vô nghĩa ở cuối để mốc đọc gọn: 0,50 -> 0,5 và 1,00 -> 1,
 * thay vì cả cột nhãn đều có đuôi ",00".
 */
const formatTick = (value: number, step: number) => {
  const formatted = formatVnNumber(value, tickDigits(step));

  return formatted.includes(",") ? formatted.replace(/,?0+$/, "") : formatted;
};

/**
 * Màu các chuỗi của biểu đồ vùng, khớp với chấm chú giải trong
 * `SolarPlantScreen.styles.ts`: Sản xuất xanh dương, Tiêu thụ cam, phần điện mặt
 * trời trong Tiêu thụ ("Từ mặt trời" / "Tự dùng") xanh lá.
 */
const PRODUCTION_SERIES_COLOR = "#2a78d6";
const SOLAR_SERIES_COLOR = "#1baf7a";

/** Lề trục của biểu đồ vùng; dùng lại ở ngoài để đặt viên nhãn đúng mốc. */
const AREA_PAD_L = 40;
const AREA_PAD_R = 8;

/**
 * Lề trái thật của biểu đồ vùng.
 *
 * Nhãn trục Y đứng trong lề này và là `Text` của SVG — không tự lớn theo cài đặt
 * cỡ chữ, nên vừa phải nhân cỡ chữ bằng tay vừa phải nới lề đúng ngần ấy. Viên
 * nhãn ngoài Svg tính lại cùng công thức nên phải gọi chung một hàm.
 */
const areaChartPadLeft = () => Math.round(AREA_PAD_L * getTextScaleFactor());

/**
 * Hoành độ của mốc đang xem trên biểu đồ vùng. Viên nhãn ("14:00 0,46 MW") nằm
 * ngoài Svg nên phải tính lại cùng công thức, nếu không nó lệch khỏi đường kẻ dọc.
 */
export const areaChartMarkerX = (
  width: number,
  index: number,
  axisCount: number,
) => {
  const padL = areaChartPadLeft();
  const plotWidth = width - padL - AREA_PAD_R;

  return axisCount > 1
    ? padL + (index / (axisCount - 1)) * plotWidth
    : padL + plotWidth / 2;
};

type ChartPoint = { index: number; value: number };

/**
 * Cắt chuỗi thành các đoạn liên tục, bỏ qua điểm trống. Chuỗi Consumption có
 * thể thiếu số ở một vài mốc và tài liệu yêu cầu để trống chứ không ép về 0, nên
 * biểu đồ phải tự ngắt đoạn thay vì tụt xuống đáy.
 */
const buildSegments = (
  data: (number | null | undefined)[],
  endIndex: number,
): ChartPoint[][] => {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];

  data.slice(0, endIndex + 1).forEach((value, index) => {
    if (value == null || !Number.isFinite(value)) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }

    current.push({ index, value });
  });

  if (current.length) segments.push(current);
  return segments;
};

// ─── Area chart (Công suất trong ngày) ───────────────────────────────────────

const AreaChartBase: React.FC<{
  /** Giá trị đã quy về đơn vị hiển thị (kW). */
  productionData: (number | null)[];
  consumptionData: (number | null)[];
  selfData?: (number | null)[];
  variant?: "merged" | "production" | "consumption";
  markerIndex?: number;
  /** Nhãn trục X suy từ mốc thời gian thật: 6 - Trưa - 18. */
  xLabels?: { label: string; idx: number }[];
  /**
   * Số mốc của cả trục (cả ngày), có thể lớn hơn số mốc đã có dữ liệu. Trục trải
   * hết 24 giờ, phần chưa tới để trống — không kéo dữ liệu cho đầy chiều ngang.
   */
  domainCount?: number;
  /** Đường kẻ ngang tham chiếu (đỉnh ngày hôm trước), cùng đơn vị với chuỗi. */
  referenceValue?: number | null;
  referenceLabel?: string;
  unitLabel?: string;
  width?: number;
  height?: number;
}> = ({
  productionData,
  consumptionData,
  selfData,
  variant = "merged",
  markerIndex,
  xLabels,
  domainCount,
  referenceValue,
  referenceLabel,
  unitLabel = "kW",
  width = CHART_WIDTH,
  height = 180,
}) => {
  // Cỡ chữ nhãn trục và lề chứa nó cùng đi theo cài đặt cỡ chữ. Khung biểu đồ
  // giữ nguyên `height` do màn hình cấp: chữ to thì vùng vẽ hụt vài px, đổi lại
  // không chỗ nào phải tính lại chiều cao.
  const textScale = getTextScaleFactor();
  const padL = areaChartPadLeft();
  const padR = AREA_PAD_R;
  const padT = 16;
  const padB = Math.round(28 * textScale);
  const W = width - padL - padR;
  const H = height - padT - padB;
  const isMerged = variant === "merged";
  const isProduction = variant === "production";
  const isConsumption = variant === "consumption";

  const pointCount = Math.max(
    productionData.length,
    consumptionData.length,
    selfData?.length ?? 0,
  );
  const endIndex = pointCount - 1;
  // Bề rộng trục tính theo cả ngày; dữ liệu tới đâu thì vẽ tới đó.
  const axisCount = Math.max(domainCount ?? 0, pointCount);

  const visibleSeries: (number | null)[][] = isProduction
    ? [productionData]
    : isConsumption
    ? [consumptionData, productionData]
    : [productionData, consumptionData, ...(selfData ? [selfData] : [])];

  const hasReference =
    referenceValue != null &&
    Number.isFinite(referenceValue) &&
    referenceValue > 0;

  const maxValue = visibleSeries.flat().reduce<number>(
    (max, value) =>
      value != null && Number.isFinite(value) && value > max ? value : max,
    // Đỉnh hôm trước phải nằm trong thang đo, không thì đường kẻ bị đẩy ra
    // ngoài khung và không thấy đâu cả.
    hasReference ? (referenceValue as number) : 0,
  );

  const yTicks = buildNiceTicks(maxValue);
  const tickStep = yTicks.length > 1 ? yTicks[1] - yTicks[0] : 1;
  const axisMax = yTicks[yTicks.length - 1] || 1;

  const px = useCallback(
    (index: number) =>
      axisCount > 1 ? padL + (index / (axisCount - 1)) * W : padL + W / 2,
    [axisCount, padL, W],
  );
  const py = useCallback(
    (value: number) => padT + H - (value / axisMax) * H,
    [axisMax, H],
  );

  /**
   * Chuỗi path là phần đắt nhất của biểu đồ (mỗi chuỗi ~288 điểm). Màn hình cha
   * render lại khá thường xuyên (đổi tab, mỗi khối tải xong) nên giữ lại kết quả
   * để không dựng lại path khi dữ liệu không đổi.
   */
  const paths = useMemo(() => {
    const linePath = (data: (number | null)[]) =>
      buildSegments(data, endIndex)
        .map((segment) =>
          segment
            .map(
              (point, position) =>
                `${position === 0 ? "M" : "L"}${px(point.index)},${py(
                  point.value,
                )}`,
            )
            .join(" "),
        )
        .join(" ");

    const areaPath = (data: (number | null)[]) =>
      buildSegments(data, endIndex)
        .map((segment) => {
          const first = segment[0];
          const last = segment[segment.length - 1];
          const line = segment
            .map(
              (point, position) =>
                `${position === 0 ? "M" : "L"}${px(point.index)},${py(
                  point.value,
                )}`,
            )
            .join(" ");

          return `${line} L${px(last.index)},${padT + H} L${px(first.index)},${
            padT + H
          } Z`;
        })
        .join(" ");

    return {
      consumptionArea: areaPath(consumptionData),
      consumptionLine: linePath(consumptionData),
      productionArea: areaPath(productionData),
      productionLine: linePath(productionData),
      selfLine: selfData?.length ? linePath(selfData) : "",
    };
  }, [H, consumptionData, endIndex, productionData, px, py, selfData]);

  const markerValue =
    markerIndex == null
      ? null
      : isConsumption
      ? consumptionData[markerIndex]
      : productionData[markerIndex];
  const resolvedLabels = xLabels?.length
    ? xLabels
    : axisCount > 1
    ? [
        { label: "6", idx: Math.round((axisCount - 1) * 0.25) },
        { label: "Trưa", idx: Math.round((axisCount - 1) * 0.5) },
        { label: "18", idx: Math.round((axisCount - 1) * 0.75) },
      ]
    : [];

  return (
    <Svg width={width} height={height}>
      {/* grid lines */}
      {yTicks.map((value) => (
        <G key={value}>
          <Line
            x1={padL}
            y1={py(value)}
            x2={padL + W}
            y2={py(value)}
            stroke="#e0e0e0"
            strokeWidth={0.8}
          />
          {/* Mốc 0 nằm ngay trên đường trục X, chỗ đó dành cho đơn vị. */}
          {value > 0 ? (
            <SvgText
              x={padL - 4}
              y={py(value) + 4}
              fontSize={scaledSvgFontSize(9)}
              fill="#aaa"
              textAnchor="end"
            >
              {formatTick(value, tickStep)}
            </SvgText>
          ) : null}
        </G>
      ))}

      {hasReference ? (
        <>
          <Line
            x1={padL}
            y1={py(referenceValue as number)}
            x2={padL + W}
            y2={py(referenceValue as number)}
            stroke="#8a8a8a"
            strokeWidth={1}
            strokeDasharray="6 7"
          />
          {referenceLabel ? (
            <SvgText
              x={padL + 2}
              y={py(referenceValue as number) + 4}
              fontSize={scaledSvgFontSize(11)}
              fontWeight="600"
              fill="#777"
            >
              {`-${referenceLabel}-`}
            </SvgText>
          ) : null}
        </>
      ) : null}

      {isMerged || isConsumption ? (
        <>
          <Path
            d={paths.consumptionArea}
            fill={isMerged ? "#eb683440" : "#eb68344f"}
          />
          <Path
            d={paths.consumptionLine}
            fill="none"
            stroke="#eb6834"
            strokeWidth={1.5}
          />
        </>
      ) : null}

      {/* Ở biểu đồ Tiêu thụ, chuỗi Sản xuất chính là phần "Từ mặt trời" nên phải
          vẽ bằng đúng màu của chấm chú giải đó (xanh lá), không phải màu xanh
          dương của biểu đồ Sản xuất. */}
      {isMerged || isProduction || isConsumption ? (
        <>
          <Path
            d={paths.productionArea}
            fill={
              isConsumption
                ? `${SOLAR_SERIES_COLOR}70`
                : isProduction
                ? `${PRODUCTION_SERIES_COLOR}45`
                : `${PRODUCTION_SERIES_COLOR}78`
            }
          />
          <Path
            d={paths.productionLine}
            fill="none"
            stroke={
              isConsumption ? SOLAR_SERIES_COLOR : PRODUCTION_SERIES_COLOR
            }
            strokeWidth={1.5}
          />
        </>
      ) : null}

      {/* Tự dùng gần như trùng khít Sản xuất ở nhà máy không bán điện, nên vẽ
          nét đứt để không mất hẳn một đường. */}
      {isMerged && selfData?.length ? (
        <Path
          d={paths.selfLine}
          fill="none"
          stroke={SOLAR_SERIES_COLOR}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      ) : null}

      {/* x axis — đậm hơn đường kẻ ngang để tách hẳn phần biểu đồ với nhãn giờ */}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#8a8a8a"
        strokeWidth={1.5}
      />
      {resolvedLabels.map(({ label, idx }) => (
        <SvgText
          key={`${label}-${idx}`}
          x={px(idx)}
          y={padT + H + Math.round(14 * textScale)}
          fontSize={scaledSvgFontSize(10)}
          fill="#999"
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}
      {/* Đơn vị nằm ở chân trục Y, đúng chỗ mốc 0 — không còn đè nhãn giờ vì
          trục X chỉ ghi 6 - Trưa - 18. */}
      <SvgText
        x={padL - 4}
        y={padT + H + Math.round(4 * textScale)}
        fontSize={scaledSvgFontSize(9)}
        fill="#aaa"
        textAnchor="end"
      >
        {unitLabel}
      </SvgText>

      {markerIndex != null && markerIndex >= 0 && markerIndex <= endIndex ? (
        <>
          <Line
            x1={px(markerIndex)}
            y1={padT}
            x2={px(markerIndex)}
            y2={padT + H}
            stroke="#333"
            strokeWidth={2}
          />
          {markerValue != null && Number.isFinite(markerValue) ? (
            <Circle
              cx={px(markerIndex)}
              cy={py(markerValue)}
              r={5}
              fill="white"
              stroke={isConsumption ? "#eb6834" : PRODUCTION_SERIES_COLOR}
              strokeWidth={2}
            />
          ) : null}
        </>
      ) : null}
    </Svg>
  );
};

export const AreaChart = React.memo(AreaChartBase);

// ─── Bar chart năng lượng (kỳ Tuần / Tháng / Năm) ────────────────────────────

/**
 * Biểu đồ cột điện năng theo mốc. Mỗi mốc có thể có nhiều cột đứng cạnh nhau,
 * mỗi cột xếp tầng nhiều đoạn, thêm một cột hẹp vẽ đè (Tự dùng nằm trong Tiêu
 * thụ) — đúng bố cục của app nhà cung cấp.
 */
const EnergyBarChartBase: React.FC<{
  buckets: EnergyBarBucket[];
  /** Mốc mới nhất còn số liệu: tô đậm + kẻ dọc, giống mốc hiện tại ở kỳ Ngày. */
  markerIndex?: number;
  unitLabel?: string;
  width?: number;
  height?: number;
}> = ({
  buckets,
  markerIndex = -1,
  unitLabel = "MWh",
  width = CHART_WIDTH,
  height = 180,
}) => {
  // Nhãn trục co giãn theo cài đặt cỡ chữ; lề trái/đáy nới theo để có chỗ đứng.
  const textScale = getTextScaleFactor();
  const padL = Math.round(44 * textScale);
  const padR = 8;
  const padT = 16;
  const padB = Math.round(30 * textScale);
  const W = width - padL - padR;
  const H = height - padT - padB;
  const bucketCount = Math.max(buckets.length, 1);
  const columnCount = Math.max(buckets[0]?.columns.length ?? 1, 1);

  const { axisMax, barWidth, columnGap, slotWidth, tickStep, yTicks } =
    useMemo(() => {
      const stackTotal = (values: number[]) =>
        values.reduce((sum, value) => sum + Math.max(value, 0), 0);

      const peak = buckets.reduce(
        (max, bucket) =>
          bucket.columns.reduce(
            (columnMax, column) =>
              Math.max(
                columnMax,
                stackTotal(column.stack.map((segment) => segment.value)),
                column.overlay?.value ?? 0,
              ),
            max,
          ),
        0,
      );

      const ticks = buildNiceTicks(peak);
      const slot = W / bucketCount;
      const gap = columnCount > 1 ? Math.min(2, slot * 0.08) : 0;

      return {
        axisMax: ticks[ticks.length - 1] || 1,
        // Chừa 28% mỗi ô làm khoảng trống giữa hai mốc, không thì cột dính liền
        // thành một dải đặc ở kỳ Tháng (31 mốc).
        barWidth: Math.max(
          (slot * 0.72 - gap * (columnCount - 1)) / columnCount,
          1.5,
        ),
        columnGap: gap,
        slotWidth: slot,
        tickStep: ticks.length > 1 ? ticks[1] - ticks[0] : 1,
        yTicks: ticks,
      };
    }, [W, bucketCount, buckets, columnCount]);

  const py = (value: number) => padT + H - (value / axisMax) * H;
  const groupWidth = barWidth * columnCount + columnGap * (columnCount - 1);
  // Nhãn trục X: giãn ra cho tối đa ~16 nhãn, quá số đó thì các nhãn đè nhau.
  const labelStep = Math.ceil(bucketCount / 16);

  return (
    <Svg width={width} height={height}>
      {yTicks.map((value) => (
        <G key={value}>
          <Line
            x1={padL}
            y1={py(value)}
            x2={padL + W}
            y2={py(value)}
            stroke="#e8e8e8"
            strokeWidth={0.8}
          />
          {/* Chỗ mốc 0 để dành cho đơn vị, giống biểu đồ vùng. */}
          {value > 0 ? (
            <SvgText
              x={padL - 4}
              y={py(value) + 4}
              fontSize={scaledSvgFontSize(9)}
              fill="#bbb"
              textAnchor="end"
            >
              {formatTick(value, tickStep)}
            </SvgText>
          ) : null}
        </G>
      ))}

      {buckets.map((bucket, bucketIndex) => {
        const groupLeft =
          padL + (bucketIndex + 0.5) * slotWidth - groupWidth / 2;
        const isMarker = bucketIndex === markerIndex;

        // Dựng hình khối trước rồi mới vẽ: mốc đang xem cần vẽ đúng các khối đó
        // lần thứ hai bằng lớp tối, nên phải có sẵn toạ độ.
        const rects: {
          fill: string;
          height: number;
          width: number;
          x: number;
          y: number;
        }[] = [];

        bucket.columns.forEach((column, columnIndex) => {
          const x = groupLeft + columnIndex * (barWidth + columnGap);
          let baseline = padT + H;

          column.stack.forEach((segment) => {
            if (!(segment.value > 0)) return;

            // Xếp tầng từ dưới lên: mỗi đoạn đứng trên đoạn trước.
            const barHeight = (segment.value / axisMax) * H;
            baseline -= barHeight;

            rects.push({
              fill: segment.color,
              height: barHeight,
              width: barWidth,
              x,
              y: baseline,
            });
          });

          if (column.overlay && column.overlay.value > 0) {
            const overlayHeight = (column.overlay.value / axisMax) * H;

            rects.push({
              fill: column.overlay.color,
              height: overlayHeight,
              // Hẹp hơn cột nền để vẫn thấy được phần cột nằm dưới.
              width: Math.max(barWidth * 0.58, 1.5),
              x,
              y: padT + H - overlayHeight,
            });
          }
        });

        return (
          <G key={`${bucket.label}-${bucketIndex}`}>
            {rects.map((rect, rectIndex) => (
              <Rect
                key={rectIndex}
                x={rect.x}
                y={rect.y}
                width={rect.width}
                height={rect.height}
                rx={1.5}
                fill={rect.fill}
              />
            ))}
            {isMarker
              ? rects.map((rect, rectIndex) => (
                  <Rect
                    key={`marker-${rectIndex}`}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rx={1.5}
                    fill="#00000038"
                  />
                ))
              : null}
          </G>
        );
      })}

      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#8a8a8a"
        strokeWidth={1.5}
      />

      {markerIndex >= 0 && markerIndex < buckets.length ? (
        <Line
          x1={padL + (markerIndex + 0.5) * slotWidth}
          y1={padT}
          x2={padL + (markerIndex + 0.5) * slotWidth}
          y2={padT + H}
          stroke="#333"
          strokeWidth={1.5}
        />
      ) : null}

      {buckets.map((bucket, bucketIndex) =>
        bucketIndex % labelStep === 0 && bucket.label ? (
          <SvgText
            key={`label-${bucketIndex}`}
            x={padL + (bucketIndex + 0.5) * slotWidth}
            y={padT + H + Math.round(15 * textScale)}
            fontSize={scaledSvgFontSize(9)}
            fill="#aaa"
            textAnchor="middle"
          >
            {bucket.label}
          </SvgText>
        ) : null,
      )}

      {/* Đơn vị ở chân trục Y, cùng chỗ với biểu đồ vùng — xem chú thích ở đó. */}
      <SvgText
        x={padL - 4}
        y={padT + H + Math.round(4 * textScale)}
        fontSize={scaledSvgFontSize(9)}
        fill="#bbb"
        textAnchor="end"
      >
        {unitLabel}
      </SvgText>
    </Svg>
  );
};

export const EnergyBarChart = React.memo(EnergyBarChartBase);

// ─── Bar chart (So sánh sản lượng) ───────────────────────────────────────────

const BarChartBase: React.FC<{
  data: SolarComparativeBucket[];
  /**
   * Nhãn hai năm. Ở chế độ "Cả năm" chỉ có MỘT mốc nên nhãn dưới mỗi cột là năm
   * của chính cột đó, chứ ghi "Cả năm" ở giữa thì không biết cột nào là năm nào.
   */
  previousLabel?: string;
  currentLabel?: string;
  unitLabel?: string;
  width?: number;
  height?: number;
}> = ({
  data,
  previousLabel,
  currentLabel,
  unitLabel = "MWh",
  width = CHART_WIDTH,
  height = 180,
}) => {
  // Nhãn trục co giãn theo cài đặt cỡ chữ; lề trái/đáy nới theo để có chỗ đứng.
  const textScale = getTextScaleFactor();
  const padL = Math.round(44 * textScale);
  const padR = 8;
  const padT = 16;
  const padB = Math.round(32 * textScale);
  const W = width - padL - padR;
  const H = height - padT - padB;
  const bucketCount = Math.max(data.length, 1);
  const maxValue = data.reduce(
    (max, bucket) => Math.max(max, bucket.previous, bucket.current),
    0,
  );
  // Cột cao nhất chạm đỉnh khung, đường kẻ ngang chỉ vẽ ở các mốc nằm dưới nó —
  // bước 1-2-5-10 để mốc không quá thưa (670 -> 200/400/600, không phải 500).
  const rawTicks = buildNiceTicks(maxValue, 4, [1, 2, 5, 10]);
  const tickStep = rawTicks.length > 1 ? rawTicks[1] - rawTicks[0] : 1;
  const axisMax = maxValue > 0 ? maxValue : 1;
  const yTicks = rawTicks.filter((value) => value < axisMax * 0.995);
  const slotWidth = W / bucketCount;
  // Một mốc duy nhất: hai cột dạt ra hai đầu trục như app nhà cung cấp.
  const isSingleBucket = data.length === 1;
  const barW = Math.max(isSingleBucket ? W * 0.3 : slotWidth * 0.32, 2);

  return (
    <Svg width={width} height={height}>
      {yTicks.map((value) => {
        const y = padT + H - (value / axisMax) * H;
        return (
          <G key={value}>
            <Line
              x1={padL}
              y1={y}
              x2={padL + W}
              y2={y}
              stroke="#e8e8e8"
              strokeWidth={0.8}
            />
            {/* Chỗ mốc 0 để dành cho đơn vị, giống hai biểu đồ còn lại. */}
            {value > 0 ? (
              <SvgText
                x={padL - 4}
                y={y + 4}
                fontSize={scaledSvgFontSize(9)}
                fill="#bbb"
                textAnchor="end"
              >
                {formatTick(value, tickStep)}
              </SvgText>
            ) : null}
          </G>
        );
      })}
      {data.map((bucket, index) => {
        const cx = padL + (index + 0.5) * slotWidth;
        const yPrevious = padT + H - (bucket.previous / axisMax) * H;
        const yCurrent = padT + H - (bucket.current / axisMax) * H;
        const xPrevious = isSingleBucket ? padL : cx - barW - 1;
        const xCurrent = isSingleBucket ? padL + W - barW : cx + 1;

        return (
          <G key={bucket.label}>
            {bucket.previous > 0 && (
              <Rect
                x={xPrevious}
                y={yPrevious}
                width={barW}
                height={padT + H - yPrevious}
                rx={2}
                fill={COMPARE_PREVIOUS_YEAR_COLOR}
              />
            )}
            {bucket.current > 0 && (
              <Rect
                x={xCurrent}
                y={yCurrent}
                width={barW}
                height={padT + H - yCurrent}
                rx={2}
                fill={COMPARE_CURRENT_YEAR_COLOR}
              />
            )}
            {isSingleBucket && (previousLabel || currentLabel) ? (
              [
                { label: previousLabel, x: xPrevious + barW / 2 },
                { label: currentLabel, x: xCurrent + barW / 2 },
              ].map(({ label, x }) =>
                label ? (
                  <SvgText
                    key={label}
                    x={x}
                    y={padT + H + Math.round(18 * textScale)}
                    fontSize={scaledSvgFontSize(9)}
                    fill="#aaa"
                    textAnchor="middle"
                  >
                    {label}
                  </SvgText>
                ) : null,
              )
            ) : (
              <SvgText
                x={cx}
                y={padT + H + Math.round(18 * textScale)}
                fontSize={scaledSvgFontSize(9)}
                fill="#aaa"
                textAnchor="middle"
              >
                {bucket.label}
              </SvgText>
            )}
          </G>
        );
      })}
      <Line
        x1={padL}
        y1={padT + H}
        x2={padL + W}
        y2={padT + H}
        stroke="#8a8a8a"
        strokeWidth={1.5}
      />
      {/* Đơn vị ở chân trục Y cho khớp với hai biểu đồ còn lại của màn. */}
      <SvgText
        x={padL - 4}
        y={padT + H + Math.round(4 * textScale)}
        fontSize={scaledSvgFontSize(9)}
        fill="#bbb"
        textAnchor="end"
      >
        {unitLabel}
      </SvgText>
    </Svg>
  );
};

export const BarChart = React.memo(BarChartBase);
