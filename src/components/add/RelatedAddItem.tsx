import React, { memo } from "react";
import AddActionFab from "./shared/AddActionFab";

type Props = {
  onPress: () => void;
};

function RelatedAddItemComponent({ onPress }: Props) {
  return <AddActionFab label="Thêm mới" onPress={onPress} variant="extended" />;
}

export const RelatedAddItem = memo(RelatedAddItemComponent);
