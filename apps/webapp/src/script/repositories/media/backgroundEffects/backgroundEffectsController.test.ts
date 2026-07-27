import {BackgroundEffectsController} from './backgroundEffectsController';
import {backgroundEffectsStore} from 'Repositories/media/useBackgroundEffectsStore';
import {SELFIE_MULTICLASS_MODEL_PATH, SELFIE_SEGMENTER_MODEL_PATH} from './pipe/options';

describe('BackgroundEffectsController effective quality', () => {
  let controller: BackgroundEffectsController;

  beforeEach(() => {
    backgroundEffectsStore.setState(backgroundEffectsStore.getInitialState(), true);
    controller = new BackgroundEffectsController();
    // Simulate an active processing session
    // Starting media pipeline isn't available in this test environment.
    Reflect.set(controller, 'refcount', 1);
  });

  it('starts privacy with the multiclass model', () => {
    controller.setModelPath(SELFIE_MULTICLASS_MODEL_PATH);

    expect(backgroundEffectsStore.getState().model).toBe('selfie-multiclass');
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('privacy');
  });

  it('reflects adaptive privacy degradation and recovery in the store', async () => {
    controller.setModelPath(SELFIE_MULTICLASS_MODEL_PATH);

    await controller.setQuality('nhd');

    expect(backgroundEffectsStore.getState().model).toBe('selfie-segmenter');
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('balanced');

    await controller.setQuality('fhd');

    expect(backgroundEffectsStore.getState().model).toBe('selfie-multiclass');
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe('privacy');
  });

  it.each([
    ['balanced', false],
    ['performance', true],
  ] as const)('maps segmenter to %s when enhancePerformance=%s', (expectedTier, enhancePerformance) => {
    controller.setModelPath(SELFIE_SEGMENTER_MODEL_PATH);
    controller.setEnhancePerformance(enhancePerformance);

    expect(backgroundEffectsStore.getState().model).toBe('selfie-segmenter');
    expect(backgroundEffectsStore.getState().effectiveQualityTier).toBe(expectedTier);
  });

  it('never writes the requested qualityTier field', async () => {
    const setQualityTierSpy = jest.spyOn(backgroundEffectsStore.getState(), 'setQualityTier');

    controller.setModelPath(SELFIE_MULTICLASS_MODEL_PATH);
    controller.setModelPath(SELFIE_SEGMENTER_MODEL_PATH);
    controller.setEnhancePerformance(true);
    await controller.setQuality('nhd');

    expect(setQualityTierSpy).not.toHaveBeenCalled();
  });
});
