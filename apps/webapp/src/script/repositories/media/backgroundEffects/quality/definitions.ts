export type QualityTier = 'fhd' | 'hd' | 'qhd' | 'nhd' | 'bypass';

export type QualityMode = 'auto' | QualityTier;

export interface QualityTierParams {
  /** Quality tier identifier */
  tier: QualityTier;
  width: number;
  high: number;
  downscale: boolean
}

export const TIER_DEFINITIONS: Record<QualityTier, QualityTierParams> = {
  fhd: {
    tier: 'fhd',
    width: 1920,
    high: 1080,
    downscale: false,
  },
  hd: {
    tier: 'hd',
    width: 1280,
    high: 720,
    downscale: true,
  },
  qhd: {
    tier: 'qhd',
    width: 960,
    high: 540,
    downscale: true,
  },
  nhd: {
    tier: 'nhd',
    width: 640,
    high: 360,
    downscale: true,
  },
  bypass: {
    tier: 'bypass',
    width: 0,
    high: 0,
    downscale: false,
  },
};
