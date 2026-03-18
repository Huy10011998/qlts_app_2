#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface Orientation : NSObject <RCTBridgeModule>

+ (UIInterfaceOrientationMask)getSupportedInterfaceOrientations;
- (void)lockToPortrait;
- (void)lockToLandscape;

@end