import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useStyles } from "../../../utils/helpers/colors";
import { makeStyles } from "../HomeScreen.styles";
import { chunkMenuItems } from "./useMenuScreenData";

type MenuGridProps<T extends { id: string }> = {
  cardWidth: number;
  columns: number;
  itemStyle?: StyleProp<ViewStyle>;
  items: T[];
  keyPrefix: string;
  renderCard: (item: T, index: number) => React.ReactNode;
};

/** Lưới card chia theo hàng, dùng chung cho chức năng, phương tiện và báo cáo. */
export default function MenuGrid<T extends { id: string }>({
  cardWidth,
  columns,
  itemStyle,
  items,
  keyPrefix,
  renderCard,
}: MenuGridProps<T>) {
  const styles = useStyles(makeStyles);
  const rows = chunkMenuItems(items, columns);

  return (
    <View style={styles.grid}>
      {rows.map((rowItems, rowIndex) => (
        <View key={`${keyPrefix}-row-${rowIndex}`} style={styles.gridRow}>
          {rowItems.map((item, itemIndex) => (
            <View
              key={`${keyPrefix}-${item.id}`}
              style={[itemStyle ?? styles.homeGridItem, { width: cardWidth }]}
            >
              {renderCard(item, rowIndex * columns + itemIndex)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
