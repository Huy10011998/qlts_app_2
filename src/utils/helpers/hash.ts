import md5 from "react-native-md5";

export function md5Hash(input: string): string {
  return md5.hex_md5(input);
}
