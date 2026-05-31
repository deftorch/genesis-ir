/**
 * @stability BETA
 * Spesifikasi penataan visual mockup device.
 */
export interface IRMockupSpec {
  scene_type: "single_device" | "multi_device" | "lifestyle" | "flat_lay";
  view_mode: "2d_flat" | "3d_perspective";
  devices: IRMockupDevice[];
  props: IRMockupPropRef[];
  scene_background: IRMockupBackground;
  lighting: IRMockupLighting;
  export_targets?: IRAppStoreTarget[];
}

/** @stability BETA */
export interface IRMockupDevice {
  id: string;
  device_lib_id: string;
  color_variant: string;
  view_angle: "front" | "side_left" | "side_right" | "angle_30" | "angle_45" | "angle_60" | "top" | "custom";
  custom_rotation?: { x: number; y: number; z: number };
  position: { x: number; y: number; z?: number };
  scale: number;
  screen_content_node_id?: string;
}

/** @stability BETA */
export interface IRMockupPropRef {
  id: string;
  prop_lib_id: string;
  position: { x: number; y: number; z?: number };
  rotation?: number;
  scale?: number;
}

/** @stability BETA */
export interface IRMockupBackground {
  type: "solid" | "gradient" | "image" | "pattern" | "transparent";
  color?: string;
  asset_id?: string;
}

/** @stability BETA */
export interface IRMockupLighting {
  type: "studio" | "natural" | "ambient" | "dramatic" | "custom";
  intensity: number;
  color?: string;
}

/** @stability BETA */
export interface IRAppStoreTarget {
  platform: "ios" | "android" | "mac" | "windows";
  device_name: string;
  width: number;
  height: number;
}
