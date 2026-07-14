export const VEHICLE_MAP_CONTROL_CSS = `
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
*,*::before,*::after{box-sizing:border-box}
.leaflet-control-zoom{border:2px solid rgba(0,0,0,.2)!important;border-radius:6px!important;overflow:hidden}
.leaflet-control-zoom a{
  display:block!important;width:38px!important;height:38px!important;padding:0!important;
  color:#334155!important;font-family:Arial,sans-serif!important;font-size:24px!important;
  font-weight:700!important;line-height:36px!important;text-align:center!important;
  text-decoration:none!important;white-space:nowrap!important
}
.leaflet-control-zoom a:first-child{border-radius:4px 4px 0 0!important}
.leaflet-control-zoom a:last-child{border-radius:0 0 4px 4px!important}
.vehicle-map-action{
  display:flex;align-items:center;justify-content:center;width:38px;height:38px;padding:0;
  background:#fff;border:2px solid rgba(0,0,0,.2);border-radius:6px;color:#1976d2;
  font-family:Arial,sans-serif;font-size:20px;font-weight:700;line-height:1
}
@media (min-width:600px){
  .leaflet-control-zoom a{width:44px!important;height:44px!important;font-size:28px!important;line-height:42px!important}
  .vehicle-map-action{width:44px;height:44px;font-size:23px}
}`;
