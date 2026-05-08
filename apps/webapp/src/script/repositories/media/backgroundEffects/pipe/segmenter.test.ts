import {getSegmenterModelUpdatedOptions} from 'Repositories/media/backgroundEffects/pipe/segmenter';

describe('getSegmenterModelUpdatedOptions', () => {
  it('returns null when model path has not changed', () => {
    expect(getSegmenterModelUpdatedOptions('model-a.tflite', 'model-a.tflite')).toBeNull();
  });

  it('returns updated options when model path changes', () => {
    expect(getSegmenterModelUpdatedOptions('model-b.tflite', 'model-a.tflite')).toEqual({
      baseOptions: {
        modelAssetPath: 'model-b.tflite',
      },
    });
  });

  it('returns updated options when current model path is undefined', () => {
    expect(getSegmenterModelUpdatedOptions('model-a.tflite', undefined)).toEqual({
      baseOptions: {
        modelAssetPath: 'model-a.tflite',
      },
    });
  });
});
