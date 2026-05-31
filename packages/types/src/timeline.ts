/**
 * @stability STABLE
 */
export interface IRKeyframe {
  time_ms: number;
  property: string;
  value: unknown;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | string;
}

/**
 * @stability STABLE
 */
export interface IRAutomationCurve {
  parameter: string;
  control_points: { time_ms: number; value: number }[];
}

/**
 * @stability STABLE
 */
export interface IRTimelineTrack {
  id: string;
  type: 'video' | 'audio' | 'motion';
  clips: { id: string; start_ms: number; duration_ms: number; asset_id: string }[];
}

/**
 * @stability STABLE
 */
export interface IRTimeline {
  duration_ms: number;
  tracks: IRTimelineTrack[];
  keyframes?: Record<string, IRKeyframe[]>;
}
