#import "Orientation.h"

@implementation Orientation

static UIInterfaceOrientationMask _orientation = UIInterfaceOrientationMaskPortrait;

+ (void)setOrientation:(UIInterfaceOrientationMask)mask {
  _orientation = mask;
}

+ (UIInterfaceOrientationMask)getSupportedInterfaceOrientations {
  return _orientation;
}

@end