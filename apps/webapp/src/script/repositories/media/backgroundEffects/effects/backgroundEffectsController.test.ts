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

import { BackgroundEffectsController } from "./backgroundEffectsController";
import { PassthroughPipeline } from "Repositories/media/backgroundEffects/pipelines/passthroughPipeline";
import { choosePipeline } from "Repositories/media/backgroundEffects";
import { MainWebGlPipeline } from "Repositories/media/backgroundEffects/pipelines/mainWebGlPipeline"; // Mocks

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
  })),
}));

jest.mock('../pipelines/passthroughPipeline', () => ({
  PassthroughPipeline: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    processFrame: jest.fn().mockResolvedValue(undefined),
    updateConfig: jest.fn(),
    stop: jest.fn(),
    isOutputCanvasTransferred: jest.fn(() => false),
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
global.document.createElement = jest.fn(() => ({
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({})),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  captureStream: jest.fn(() => ({
    getVideoTracks: () => [
      {
        stop: jest.fn(),
      },
    ],
  })),
})) as any;

describe('BackgroundEffectsController', () => {
  let controller: BackgroundEffectsController;
  let mockTrack: any;

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
    const result = await controller.start(mockTrack);

    expect(result).toHaveProperty('outputTrack');
    expect(typeof result.stop).toBe('function');
  });

  it('should set mode and update pipeline config', async () => {
    await controller.start(mockTrack);

    const spy = jest.spyOn<any, any>(controller as any, 'updatePipelineConfig');

    controller.setMode('virtual');

    expect(spy).toHaveBeenCalled();
  });

  it('should clamp blur strength between 0 and 1', async () => {
    await controller.start(mockTrack);

    controller.setBlurStrength(2); // too high
    expect((controller as any).blurStrength).toBe(1);

    controller.setBlurStrength(-1); // too low
    expect((controller as any).blurStrength).toBe(0);
  });

  it('should stop and clean up resources', async () => {
    const {stop} = await controller.start(mockTrack);

    await stop();

    expect((controller as any).pipelineImpl).toBeNull();
    expect((controller as any).frameSource).toBeNull();
    expect((controller as any).outputTrack).toBeNull();
  });

  it('should return false for isProcessing after stop', async () => {
    await controller.start(mockTrack);
    await controller.stop();

    expect(controller.isProcessing()).toBe(false);
  });

  it('should update quality mode', async () => {
    await controller.start(mockTrack);

    controller.setQuality('auto');

    expect((controller as any).quality).toBe('auto');
  });

  it('should set debug mode', async () => {
    await controller.start(mockTrack);

    controller.setDebugMode('maskOnly');

    expect((controller as any).debugMode).toBe('maskOnly');
  });

  it('calls stop before starting again', async () => {
    const stopSpy = jest.spyOn(controller, 'stop');

    await controller.start(mockTrack);

    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('clamps blur strength from start options', async () => {
    await controller.start(mockTrack, {blurStrength: 999});

    expect((controller as any).blurStrength).toBe(1);
  });

  it('returns true for isProcessing after start', async () => {
    await controller.start(mockTrack);

    expect(controller.isProcessing()).toBe(true);
  });

  it('uses pipeline override when provided', async () => {
    await controller.start(mockTrack, {pipelineOverride: 'passthrough'});

    expect(choosePipeline).toHaveBeenCalled();
    expect((controller as any).pipeline).toBe('passthrough');
    expect(PassthroughPipeline).toHaveBeenCalled();
  });

  it('uses chosen pipeline when no override is provided', async () => {
    await controller.start(mockTrack);

    expect(choosePipeline).toHaveBeenCalled();
    expect((controller as any).pipeline).toBe('main-webgl2');
    expect(MainWebGlPipeline).toHaveBeenCalled();
  });

  it('applies runtime config from start options', async () => {
    await controller.start(mockTrack, {
      mode: 'virtual',
      debugMode: 'maskOnly',
      quality: 'high',
      targetFps: 24,
    } as any);

    expect((controller as any).mode).toBe('virtual');
    expect((controller as any).debugMode).toBe('maskOnly');
    expect((controller as any).quality).toBe('high');
    expect((controller as any).targetFps).toBe(24);
  });

  it('updates pipeline config when setters are called', async () => {
    await controller.start(mockTrack);

    const pipelineInstance = (MainWebGlPipeline as jest.Mock).mock.results[0].value;

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

    await controller.start(mockTrack);

    expect(PassthroughPipeline).toHaveBeenCalled();
    expect((controller as any).pipeline).toBe('passthrough');
  });

  it('sets max quality tier', () => {
    controller.setMaxQualityTier('high');

    expect(controller.getMaxQualityTier()).toBe('high');
  });

  it('registers ended listener on input track', async () => {
    await controller.start(mockTrack);

    expect(mockTrack.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
  });

  it('stops previous resources on repeated start', async () => {
    await controller.start(mockTrack);
    const firstOutputTrack = (controller as any).outputTrack;

    await controller.start(mockTrack);

    expect(firstOutputTrack.stop).toHaveBeenCalled();
  });
});
