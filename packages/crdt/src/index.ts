import { IRDelta } from '@genesis/types';

/**
 * Merge local and remote deltas
 * @stability BETA
 */
export function mergeDeltas(local: IRDelta[], remote: IRDelta[]): IRDelta[] {
  return [...local, ...remote];
}
