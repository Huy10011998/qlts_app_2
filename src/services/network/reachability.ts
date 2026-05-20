import axios from "axios";
import NetInfo from "@react-native-community/netinfo";
import { BASE_URL } from "../../config/index";

export const SERVER_UNAVAILABLE_MESSAGE =
  "Kết nối đến máy chủ bị gián đoạn. Vui lòng kết nối và thử tải lại";

const reachabilityApi = axios.create({
  timeout: 5000,
  validateStatus: () => true,
});

export type ServerReachability = {
  hasInternet: boolean;
  canReachServer: boolean;
};

export const checkServerReachability =
  async (): Promise<ServerReachability> => {
    const netState = await NetInfo.fetch();
    const hasInternet =
      netState.isConnected === true && netState.isInternetReachable !== false;

    if (!hasInternet) {
      return {
        hasInternet: false,
        canReachServer: false,
      };
    }

    try {
      await reachabilityApi.get(BASE_URL);
      return {
        hasInternet: true,
        canReachServer: true,
      };
    } catch {
      return {
        hasInternet: true,
        canReachServer: false,
      };
    }
  };
