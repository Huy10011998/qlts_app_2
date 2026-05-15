import React from "react";
import EmptyState from "../../ui/EmptyState";

type AssetListEmptyStateProps = {
  iconName: string;
  title: string;
  subtitle: string;
  fullHeight?: boolean;
};

export default function AssetListEmptyState({
  iconName,
  title,
  subtitle,
  fullHeight = true,
}: AssetListEmptyStateProps) {
  return (
    <EmptyState
      iconName={iconName}
      title={title}
      subtitle={subtitle}
      fullHeight={fullHeight}
    />
  );
}
