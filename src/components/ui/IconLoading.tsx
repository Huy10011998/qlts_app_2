import { ActivityIndicator } from "react-native";

export default function IsLoading() {
  return (
    <ActivityIndicator
      size="large"
      color="#FF3333"
      style={{ justifyContent: "center", flex: 1 }}
    />
  );
}
