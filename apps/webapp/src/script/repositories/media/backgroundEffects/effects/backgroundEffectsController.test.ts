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
});
