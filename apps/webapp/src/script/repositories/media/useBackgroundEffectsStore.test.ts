import {backgroundEffectsStore} from './useBackgroundEffectsStore';
import {DEFAULT_BUILTIN_BACKGROUND_ID} from 'Repositories/media/VideoBackgroundEffects';

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

  it('never allows the enhanced model and performance enhancement to be active at the same time', () => {
    backgroundEffectsStore.getState().setQualityTier('performance');

    backgroundEffectsStore.getState().setEnhancedModelActive(true);

    expect(backgroundEffectsStore.getState().qualityTier).toBe('performance');
  });

  it('downgrades from privacy to balanced when the enhanced model becomes inactive', () => {
    backgroundEffectsStore.getState().setQualityTier('privacy');

    backgroundEffectsStore.getState().setEnhancedModelActive(false);

    expect(backgroundEffectsStore.getState().qualityTier).toBe('balanced');
  });

  it('does not change qualityTier when setEnhancedModelActive is called outside of privacy', () => {
    backgroundEffectsStore.getState().setQualityTier('balanced');
    backgroundEffectsStore.getState().setEnhancedModelActive(false);
    expect(backgroundEffectsStore.getState().qualityTier).toBe('balanced');

    backgroundEffectsStore.getState().setQualityTier('performance');
    backgroundEffectsStore.getState().setEnhancedModelActive(false);
    expect(backgroundEffectsStore.getState().qualityTier).toBe('performance');
  });

  it('initializes performance panel as disabled', () => {
    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(false);
  });

  it('updates isPerformancePanelEnabled when setIsPerformancePanelEnabled is called', () => {
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(true);

    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(true);
  });
});
