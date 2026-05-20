#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(LocalNetworkPermission, NSObject)

RCT_EXTERN_METHOD(
  requestAccess:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  checkAccess:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
