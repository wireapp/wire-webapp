import {Maybe} from 'true-myth';
import {areCapabilityInfosEqual} from 'Components/calling/videoControls/videoBackgroundPerformancePanel/capabilityInformationValidator';
import {createFactory} from '@enormora/objectory';
import {CapabilityInfo} from 'Repositories/media/backgroundEffects/backgroundEffectsWorkerTypes';

const capabilityInfoFactory = createFactory<CapabilityInfo>(() => {
  return {
    offscreenCanvas: false,
    worker: false,
    webgl2: false,
    requestVideoFrameCallback: false,
  };
});

describe('areCapabilityInfosEqual', () => {
  it('returns false when initialCapabilityInfo is a Nothing', () => {
    const initialCapabilityInfo = Maybe.nothing<CapabilityInfo>();
    const futureCapabilityInfo = Maybe.just(capabilityInfoFactory.build());

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
  });

  it('returns false when futureCapabilityInfo is a Nothing', () => {
    const initialCapabilityInfo = Maybe.just(capabilityInfoFactory.build());
    const futureCapabilityInfo = Maybe.nothing<CapabilityInfo>();

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
  });

  it('returns false when both capability infos are Nothing', () => {
    const initialCapabilityInfo = Maybe.nothing<CapabilityInfo>();
    const futureCapabilityInfo = Maybe.nothing<CapabilityInfo>();

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
  });

  it.each`
    property                       | initialValue | futureValue
    ${'webgl2'}                    | ${false}     | ${true}
    ${'webgl2'}                    | ${true}      | ${false}
    ${'worker'}                    | ${false}     | ${true}
    ${'worker'}                    | ${true}      | ${false}
    ${'offscreenCanvas'}           | ${false}     | ${true}
    ${'offscreenCanvas'}           | ${true}      | ${false}
    ${'requestVideoFrameCallback'} | ${false}     | ${true}
    ${'requestVideoFrameCallback'} | ${true}      | ${false}
  `(
    'returns false when $property changes from $initialValue to $futureValue',
    ({property, initialValue, futureValue}) => {
      const initialCapabilityInfo = Maybe.just(
        capabilityInfoFactory.build({
          [property]: initialValue,
        }),
      );

      const futureCapabilityInfo = Maybe.just(
        capabilityInfoFactory.build({
          [property]: futureValue,
        }),
      );

      expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
    },
  );

  it.each`
    capabilityInfo
    ${capabilityInfoFactory.build()}
    ${capabilityInfoFactory.build({
  offscreenCanvas: true,
  worker: true,
  webgl2: true,
  requestVideoFrameCallback: true,
})}
    ${capabilityInfoFactory.build({
  offscreenCanvas: true,
  worker: false,
  webgl2: true,
  requestVideoFrameCallback: false,
})}
    ${capabilityInfoFactory.build({
  offscreenCanvas: false,
  worker: true,
  webgl2: false,
  requestVideoFrameCallback: true,
})}
  `('returns true when all attributes are equal: $capabilityInfo', ({capabilityInfo}) => {
    const initialCapabilityInfo = Maybe.just(capabilityInfo);
    const futureCapabilityInfo = Maybe.just({...capabilityInfo});

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(true);
  });

  it('returns false when multiple attributes are different', () => {
    const initialCapabilityInfo = Maybe.just(
      capabilityInfoFactory.build({
        offscreenCanvas: false,
        worker: false,
        webgl2: false,
        requestVideoFrameCallback: false,
      }),
    );

    const futureCapabilityInfo = Maybe.just(
      capabilityInfoFactory.build({
        offscreenCanvas: true,
        worker: true,
        webgl2: true,
        requestVideoFrameCallback: true,
      }),
    );

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
  });
});
