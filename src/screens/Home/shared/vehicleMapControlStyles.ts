export const VEHICLE_MAP_CONTROL_CSS = `
html{-webkit-text-size-adjust:none;text-size-adjust:none}
*,*::before,*::after{box-sizing:border-box}
.leaflet-control-zoom{border:2px solid rgba(0,0,0,.2)!important;border-radius:6px!important;overflow:hidden}
.leaflet-control-zoom a{
  display:flex!important;align-items:center!important;justify-content:center!important;
  width:38px!important;min-width:38px!important;max-width:38px!important;
  height:38px!important;min-height:38px!important;max-height:38px!important;padding:0!important;
  color:#334155!important;font-size:0!important;line-height:1!important;
  text-align:center!important;text-decoration:none!important;white-space:nowrap!important
}
.leaflet-control-zoom a::before{
  display:block;font-family:Arial,sans-serif;font-size:24px!important;font-weight:700;
  line-height:1!important;transform:none!important
}
.leaflet-control-zoom-in::before{content:'+'}
.leaflet-control-zoom-out::before{content:'−'}
.leaflet-control-zoom a:first-child{border-radius:4px 4px 0 0!important}
.leaflet-control-zoom a:last-child{border-radius:0 0 4px 4px!important}
.vehicle-map-action{
  display:flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;
  background:#fff;border:2px solid rgba(0,0,0,.2);border-radius:6px;color:#1976d2;
  font-family:Arial,sans-serif;font-size:20px;font-weight:700;line-height:1
}
@media (min-width:600px){
  .leaflet-control-zoom a{
    width:44px!important;min-width:44px!important;max-width:44px!important;
    height:44px!important;min-height:44px!important;max-height:44px!important
  }
  .leaflet-control-zoom a::before{font-size:28px!important}
  .vehicle-map-action{width:44px;height:44px;font-size:23px}
}`;
