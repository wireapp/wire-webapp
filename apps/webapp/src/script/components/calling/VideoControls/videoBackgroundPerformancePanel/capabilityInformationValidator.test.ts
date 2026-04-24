import {Maybe} from 'true-myth';
import {areCapabilityInfosEqual} from 'Components/calling/VideoControls/videoBackgroundPerformancePanel/capabilityInformationValidator';
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

  it('returns false when webgl2 is not equal', () => {
    const initialCapabilityInfo = Maybe.just(capabilityInfoFactory.build({webgl2: false}));
    const futureCapabilityInfo = Maybe.just(capabilityInfoFactory.build({webgl2: true}));

    expect(areCapabilityInfosEqual(initialCapabilityInfo, futureCapabilityInfo)).toBe(false);
  });
});
