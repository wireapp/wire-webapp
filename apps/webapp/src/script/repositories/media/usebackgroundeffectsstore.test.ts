import {backgroundEffectsStore} from './usebackgroundeffectsstore';
import {DEFAULT_BUILTIN_BACKGROUND_ID} from 'Repositories/media/videobackgroundeffects';

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

  it('initializes high quality blur as enabled', () => {
    expect(backgroundEffectsStore.getState().isHighQualityBlurEnabled).toBe(true);
  });

  it('updates isHighQualityBlurEnabled when setIsHighQualityBlurEnabled is called', () => {
    backgroundEffectsStore.getState().setIsHighQualityBlurEnabled(false);

    expect(backgroundEffectsStore.getState().isHighQualityBlurEnabled).toBe(false);
  });

  it('can enable high quality blur again', () => {
    backgroundEffectsStore.getState().setIsHighQualityBlurEnabled(false);
    backgroundEffectsStore.getState().setIsHighQualityBlurEnabled(true);

    expect(backgroundEffectsStore.getState().isHighQualityBlurEnabled).toBe(true);
  });

  it('initializes performance panel as disabled', () => {
    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(false);
  });

  it('updates isPerformancePanelEnabled when setIsPerformancePanelEnabled is called', () => {
    backgroundEffectsStore.getState().setIsPerformancePanelEnabled(true);

    expect(backgroundEffectsStore.getState().isPerformancePanelEnabled).toBe(true);
  });
});
