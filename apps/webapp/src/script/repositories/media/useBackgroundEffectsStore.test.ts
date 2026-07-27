import {backgroundEffectsStore} from './useBackgroundEffectsStore';
import {DEFAULT_BUILTIN_BACKGROUND_ID} from 'Repositories/media/VideoBackgroundEffects';
import {
  SELFIE_MULTICLASS_MODEL_PATH,
  SELFIE_SEGMENTER_MODEL_PATH,
} from 'Repositories/media/backgroundEffects/pipe/options';

describe('backgroundEffectsStore:lastVirtualBackgroundId', () => {
  beforeEach(() => {
    backgroundEffectsStore.setState(backgroundEffectsStore.getInitialState(), true);
  });

  it('initializes lastVirtualBackgroundId with the default builtin background id', () => {
    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe(DEFAULT_BUILTIN_BACKGROUND_ID);
  });

  it('updates lastVirtualBackgroundId when setLastVirtualBackgroundId is called', () => {
    backgroundEffectsStore.getState().setLastVirtualBackgroundId('custom-bg-id');

    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe('custom-bg-id');
  });

  it('always has a defined lastVirtualBackgroundId', () => {
    const state = backgroundEffectsStore.getState();

    expect(state.lastVirtualBackgroundId).toBeDefined();
    expect(typeof state.lastVirtualBackgroundId).toBe('string');
  });

  it('initializes background effects with privacy quality', () => {
    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
  });

  it('updates qualityTier when setQualityTier is called', () => {
    backgroundEffectsStore.getState().setQualityTier('balanced');

    expect(backgroundEffectsStore.getState().qualityTier).toBe('balanced');
  });

  it('can switch back to privacy quality', () => {
    backgroundEffectsStore.getState().setQualityTier('balanced');
    backgroundEffectsStore.getState().setQualityTier('privacy');

    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
  });

  it('keeps the model indicator separate from the explicitly set quality tier', () => {
    backgroundEffectsStore.getState().setQualityTier('privacy');

    // Adaptive quality temporarily switches from multiclass to segmenter.
    backgroundEffectsStore.getState().setModel(SELFIE_SEGMENTER_MODEL_PATH);

    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
    expect(backgroundEffectsStore.getState().model).toBe('selfie-segmenter');

    // The high tier recovers and switches back to multiclass.
    backgroundEffectsStore.getState().setModel(SELFIE_MULTICLASS_MODEL_PATH);

    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
    expect(backgroundEffectsStore.getState().model).toBe('selfie-multiclass');
  });

  it('updates qualityTier when explicitly set', () => {
    backgroundEffectsStore.getState().setQualityTier('balanced');
    expect(backgroundEffectsStore.getState().qualityTier).toBe('balanced');

    backgroundEffectsStore.getState().setQualityTier('performance');
    expect(backgroundEffectsStore.getState().qualityTier).toBe('performance');
  });

  it('initializes effectiveQualityTier with privacy quality', () => {
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('privacy');
  });

  it('updates effectiveQualityTier independently from qualityTier', () => {
    backgroundEffectsStore.getState().setQualityTier('privacy');
    backgroundEffectsStore.getState().setEffectiveQualityTier('balanced');

    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('balanced');
  });

  it('does not let setQualityTier affect effectiveQualityTier and vice versa', () => {
    backgroundEffectsStore.getState().setEffectiveQualityTier('performance');
    backgroundEffectsStore.getState().setQualityTier('balanced');

    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('performance');
    expect(backgroundEffectsStore.getState().qualityTier).toBe('balanced');

    backgroundEffectsStore.getState().setQualityTier('privacy');

    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('performance');
    expect(backgroundEffectsStore.getState().qualityTier).toBe('privacy');
  });

  it('initializes performance panel as disabled', () => {
    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(false);
  });

  it('updates isPerformancePanelEnabled when setIsPerformancePanelEnabled is called', () => {
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(true);

    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(true);
  });
});
