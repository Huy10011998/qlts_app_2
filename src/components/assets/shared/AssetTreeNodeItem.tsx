import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { TreeNode } from "../../../types/Index";
import { CARD_SHADOW } from "./listTheme";

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
    <View style={[styles.nodeWrap, { paddingLeft: level > 0 ? 16 : 0 }]}>
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
              { backgroundColor: hasChildren ? "#FFF8F0" : "#EEF2FF" },
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
          <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
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
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 11,
    paddingRight: 12,
    paddingLeft: 16,
    overflow: "hidden",
    gap: 10,
    ...CARD_SHADOW,
  },
  nodeRowChild: {
    backgroundColor: "#FAFBFE",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EDF0F5",
  },
  nodeRowSelected: {
    borderWidth: 1,
    borderColor: "#FFD6D6",
    backgroundColor: "#FFF8F8",
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
    color: "#0F1923",
    fontWeight: "600",
    lineHeight: 18,
  },
  nodeTextChild: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#374151",
  },
  nodeChevronWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F0",
  },
});
