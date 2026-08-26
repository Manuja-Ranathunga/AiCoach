import { createMockPoseEngine } from './mockEngine';
import type { PoseEngineFactory } from './types';

export * from './types';

/**
 * Swap this for the real `/ml` pose engine once it's ready — it must satisfy
 * the same `PoseEngineFactory` signature from `./types`. Nothing that calls
 * `createPoseEngine` needs to change.
 */
export const createPoseEngine: PoseEngineFactory = createMockPoseEngine;
