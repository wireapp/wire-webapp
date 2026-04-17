/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {BackgroundEffectsController} from './backgroundEffectsController';
import {choosePipeline} from 'Repositories/media/backgroundEffects';
import {MainWebGlPipeline} from 'Repositories/media/backgroundEffects/pipelines/mainWebGlPipeline';
import {PassthroughPipeline} from 'Repositories/media/backgroundEffects/pipelines/passthroughPipeline';

import type {DebugMode, EffectMode, PipelineType, QualityMode, StartOptions} from '../backgroundEffectsWorkerTypes';
import type {BackgroundEffectsRenderingPipeline} from '../pipelines/backgroundEffectsRenderingPipeline';

// Mocks
jest.mock('./capability', () => ({
  detectCapabilities: jest.fn(() => ({webgl2: true})),
  choosePipeline: jest.fn(() => 'main-webgl2'),
}));

jest.mock('../pipelines/mainWebGlPipeline', () => ({
  MainWebGlPipeline: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    processFrame: jest.fn().mockResolvedValue(undefined),
    updateConfig: jest.fn(),
    stop: jest.fn(),
    isOutputCanvasTransferred: jest.fn(() => false),
    notifyDroppedFrames: jest.fn(),
    setBackgroundImage: jest.fn(),
    setBackgroundVideoFrame: jest.fn(),
    clearBackground: jest.fn(),
  })),
}));

jest.mock('../pipelines/passthroughPipeline', () => ({
  PassthroughPipeline: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    processFrame: jest.fn().mockResolvedValue(undefined),
    updateConfig: jest.fn(),
    stop: jest.fn(),
    isOutputCanvasTransferred: jest.fn(() => false),
    notifyDroppedFrames: jest.fn(),
    setBackgroundImage: jest.fn(),
    setBackgroundVideoFrame: jest.fn(),
    clearBackground: jest.fn(),
  })),
}));

jest.mock('./frameSource', () => ({
  FrameSource: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
  })),
}));

jest.mock('Util/logger', () => ({
  getLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

// Browser API mocks
const mockOutputTrack = {
  stop: jest.fn(),
} as unknown as MediaStreamTrack;

Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(
    (): {
      width: number;
      height: number;
      getContext: jest.Mock<{}, [], any>;
      addEventListener: jest.Mock<any, any, any>;
      removeEventListener: jest.Mock<any, any, any>;
      captureStream: jest.Mock<{getVideoTracks: () => MediaStreamTrack[]}, [], any>;
    } => ({
      width: 0,
      height: 0,
      getContext: jest.fn(() => ({})),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      captureStream: jest.fn(() => ({
        getVideoTracks: () => [mockOutputTrack],
      })),
    }),
  ),
});

type MediaStreamTrackPartial = Partial<MediaStreamTrack> & {
  getSettings: MediaStreamTrack['getSettings'];
  addEventListener: MediaStreamTrack['addEventListener'];
};

type MockPipelineInstance = Pick<
  BackgroundEffectsRenderingPipeline,
  'init' | 'processFrame' | 'updateConfig' | 'stop' | 'isOutputCanvasTransferred'
> & {
  notifyDroppedFrames: jest.Mock;
  setBackgroundImage: jest.Mock;
  setBackgroundVideoFrame: jest.Mock;
  clearBackground: jest.Mock;
};

type ControllerInternals = {
  blurStrength: number;
  pipelineImpl: BackgroundEffectsRenderingPipeline | null;
  frameSource: object | null;
  outputTrack: MediaStreamTrack | null;
  quality: QualityMode;
  debugMode: DebugMode;
  pipeline: PipelineType;
  mode: EffectMode;
  targetFps: number;
  updatePipelineConfig: () => void;
};

const getInternals = (controller: BackgroundEffectsController): ControllerInternals =>
  controller as unknown as ControllerInternals;

describe('BackgroundEffectsController', () => {
  let controller: BackgroundEffectsController;
  let mockTrack: MediaStreamTrackPartial;

  beforeEach(() => {
    controller = new BackgroundEffectsController();

    mockTrack = {
      getSettings: () => ({
        width: 1280,
        height: 720,
      }),
      addEventListener: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should start and return outputTrack + stop function', async () => {
    const result = await controller.start(mockTrack as MediaStreamTrack);

    expect(result).toHaveProperty('outputTrack');
    expect(typeof result.stop).toBe('function');
  });

  it('should set mode and update pipeline config', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    const spy = jest.spyOn(getInternals(controller), 'updatePipelineConfig');

    controller.setMode('virtual');

    expect(spy).toHaveBeenCalled();
  });

  it('should clamp blur strength between 0 and 1', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    controller.setBlurStrength(2); // too high
    expect(getInternals(controller).blurStrength).toBe(1);

    controller.setBlurStrength(-1); // too low
    expect(getInternals(controller).blurStrength).toBe(0);
  });

  it('should stop and clean up resources', async () => {
    const {stop} = await controller.start(mockTrack as MediaStreamTrack);

    await stop();

    expect(getInternals(controller).pipelineImpl).toBeNull();
    expect(getInternals(controller).frameSource).toBeNull();
    expect(getInternals(controller).outputTrack).toBeNull();
  });

  it('should return false for isProcessing after stop', async () => {
    await controller.start(mockTrack as MediaStreamTrack);
    await controller.stop();

    expect(controller.isProcessing()).toBe(false);
  });

  it('should update quality mode', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    controller.setQuality('auto');

    expect(getInternals(controller).quality).toBe('auto');
  });

  it('should set debug mode', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    controller.setDebugMode('maskOnly');

    expect(getInternals(controller).debugMode).toBe('maskOnly');
  });

  it('calls stop before starting again', async () => {
    const stopSpy = jest.spyOn(controller, 'stop');

    await controller.start(mockTrack as MediaStreamTrack);

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('clamps blur strength from start options', async () => {
    await controller.start(mockTrack as MediaStreamTrack, {blurStrength: 999});

    expect(getInternals(controller).blurStrength).toBe(1);
  });

  it('returns true for isProcessing after start', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    expect(controller.isProcessing()).toBe(true);
  });

  it('uses pipeline override when provided', async () => {
    await controller.start(mockTrack as MediaStreamTrack, {pipelineOverride: 'passthrough'});

    expect(choosePipeline).toHaveBeenCalled();
    expect(getInternals(controller).pipeline).toBe('passthrough');
    expect(PassthroughPipeline).toHaveBeenCalled();
  });

  it('uses chosen pipeline when no override is provided', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    expect(choosePipeline).toHaveBeenCalled();
    expect(getInternals(controller).pipeline).toBe('main-webgl2');
    expect(MainWebGlPipeline).toHaveBeenCalled();
  });

  it('applies runtime config from start options', async () => {
    const options: StartOptions = {
      mode: 'virtual',
      debugMode: 'maskOnly',
      quality: 'high',
      targetFps: 24,
    };

    await controller.start(mockTrack as MediaStreamTrack, options);

    expect(getInternals(controller).mode).toBe('virtual');
    expect(getInternals(controller).debugMode).toBe('maskOnly');
    expect(getInternals(controller).quality).toBe('high');
    expect(getInternals(controller).targetFps).toBe(24);
  });

  it('updates pipeline config when setters are called', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    const pipelineInstance = (MainWebGlPipeline as jest.Mock).mock.results[0].value as MockPipelineInstance;

    controller.setMode('virtual');
    controller.setDebugMode('maskOnly');
    controller.setBlurStrength(0.3);
    controller.setQuality('auto');

    expect(pipelineInstance.updateConfig).toHaveBeenCalled();
    expect(pipelineInstance.updateConfig).toHaveBeenLastCalledWith({
      mode: 'virtual',
      debugMode: 'maskOnly',
      blurStrength: 0.3,
      quality: 'auto',
    });
  });

  it('falls back to passthrough pipeline if init fails', async () => {
    (MainWebGlPipeline as jest.Mock).mockImplementationOnce(() => ({
      init: jest.fn().mockRejectedValue(new Error('init failed')),
      processFrame: jest.fn().mockResolvedValue(undefined),
      updateConfig: jest.fn(),
      stop: jest.fn(),
      isOutputCanvasTransferred: jest.fn(() => false),
      notifyDroppedFrames: jest.fn(),
      setBackgroundImage: jest.fn(),
      setBackgroundVideoFrame: jest.fn(),
      clearBackground: jest.fn(),
    }));

    await controller.start(mockTrack as MediaStreamTrack);

    expect(PassthroughPipeline).toHaveBeenCalled();
    expect(getInternals(controller).pipeline).toBe('passthrough');
  });

  it('sets max quality tier', () => {
    controller.setMaxQualityTier('high');

    expect(controller.getMaxQualityTier()).toBe('high');
  });

  it('registers ended listener on input track', async () => {
    await controller.start(mockTrack as MediaStreamTrack);

    expect(mockTrack.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
  });

  it('stops previous resources on repeated start', async () => {
    await controller.start(mockTrack as MediaStreamTrack);
    const firstOutputTrack = getInternals(controller).outputTrack;

    await controller.start(mockTrack as MediaStreamTrack);

    expect(firstOutputTrack?.stop).toHaveBeenCalled();
  });
});
