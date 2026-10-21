import React from "react";
import EmptyState from "../../ui/EmptyState";

type AssetListEmptyStateProps = {
  iconName: string;
  title: string;
  subtitle: string;
  fullHeight?: boolean;
  /** Nút dưới phần chữ, ví dụ "Thử lại" ở màn lỗi hay "Xoá từ khoá". */
  actionLabel?: string;
  onActionPress?: () => void;
};

export default function AssetListEmptyState({
  iconName,
  title,
  subtitle,
  fullHeight = true,
  actionLabel,
  onActionPress,
}: AssetListEmptyStateProps) {
  return (
    <EmptyState
      iconName={iconName}
      title={title}
      subtitle={subtitle}
      fullHeight={fullHeight}
      actionLabel={actionLabel}
      onActionPress={onActionPress}
    />
  );
}
