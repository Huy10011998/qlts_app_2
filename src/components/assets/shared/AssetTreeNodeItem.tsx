import { C } from "../../../utils/helpers/colors";
import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import type { TreeNode } from "../../../types/index";
import { CARD_SHADOW } from "./listTheme";

const localStyles = {
  levelIndent: {
    paddingLeft: 16,
  },
  folderIconWrap: {
    backgroundColor: C.amberLight,
  },
  leafIconWrap: {
    backgroundColor: C.indigoSurface,
  },
};

type AssetTreeNodeItemProps = {
  node: TreeNode;
  level?: number;
  onSelect: (node: TreeNode) => void;
  expandAll?: boolean;
  selectedNode: TreeNode | null;
};

export default function AssetTreeNodeItem({
  node,
  level = 0,
  onSelect,
  expandAll = false,
  selectedNode,
}: AssetTreeNodeItemProps) {
  const [expanded, setExpanded] = useState(node.expanded || expandAll);

  useEffect(() => {
    if (expandAll) {
      setExpanded(true);
    }
  }, [expandAll]);

  const hasChildren = Boolean(node.children?.length);
  const isSelected = selectedNode?.index === node.index;
  const iconColor = hasChildren ? "#E67700" : "#3B5BDB";

  const handleIconPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((previous) => !previous);
  };

  return (
    <View style={[styles.nodeWrap, level > 0 && localStyles.levelIndent]}>
      <View
        style={[
          styles.nodeRow,
          level > 0 && styles.nodeRowChild,
          isSelected && styles.nodeRowSelected,
        ]}
      >
        <View
          style={[
            styles.nodeAccent,
            { backgroundColor: iconColor },
          ]}
        />

        <TouchableOpacity
          style={styles.nodeTextWrap}
          onPress={() => onSelect(node)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.nodeIconWrap,
              hasChildren ? localStyles.folderIconWrap : localStyles.leafIconWrap,
            ]}
          >
            <Ionicons
              name={hasChildren ? "folder-open" : "document-text-outline"}
              size={16}
              color={iconColor}
            />
          </View>
          <Text
            style={[styles.nodeText, level > 0 && styles.nodeTextChild]}
            numberOfLines={2}
            allowFontScaling={false}
          >
            {node.text}
          </Text>
        </TouchableOpacity>

        {hasChildren ? (
          <TouchableOpacity
            onPress={handleIconPress}
            style={styles.nodeChevronWrap}
          >
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={13}
              color="#E67700"
            />
          </TouchableOpacity>
        ) : (
          <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
        )}
      </View>

      {hasChildren && expanded && (
        <View>
          {node.children?.map((child) => (
            <AssetTreeNodeItem
              key={child.index}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              expandAll={expandAll}
              selectedNode={selectedNode}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nodeWrap: {
    marginBottom: 6,
  },
  nodeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    minHeight: 58,
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 16,
    overflow: "hidden",
    gap: 10,
    ...CARD_SHADOW,
  },
  nodeRowChild: {
    backgroundColor: C.surfaceAlt,
    minHeight: 56,
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  nodeRowSelected: {
    borderWidth: 1,
    borderColor: C.redBorder,
    backgroundColor: C.redSurface,
  },
  nodeAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  nodeTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nodeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nodeText: {
    flex: 1,
    fontSize: 13.5,
    color: C.text,
    fontWeight: "600",
    lineHeight: 20,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  nodeTextChild: {
    fontSize: 12.5,
    fontWeight: "500",
    color: C.textSecondary,
    lineHeight: 19,
  },
  nodeChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.amberLight,
  },
});
