/**
 * Barrel kept for backward compatibility: this module used to hold both the
 * HTTP client and every domain endpoint. It is now split into `httpClient.ts`
 * (axios instance, auth/refresh interceptors, `callApi`) and per-domain files.
 * Existing imports from `services/data/callApi` keep working via these re-exports.
 */
export * from "./httpClient";
export * from "./assetApi";
export * from "./commonApi";
export * from "./vehicleApi";
export * from "./dhcdApi";
export * from "./cameraApi";
export * from "./reportApi";
