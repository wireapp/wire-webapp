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

import {BackgroundEffectsHandler, ReleasableMediaStream} from './backgroundEffectsHandler';
import {backgroundEffectsStore} from './useBackgroundEffectsStore';
import {DEFAULT_BUILTIN_BACKGROUND_ID} from 'Repositories/media/videoBackgroundEffects';

// Mocks
jest.mock('Util/localStorage', () => ({
  getStorage: jest.fn(),
}));

jest.mock('Repositories/media/videoBackgroundEffects', () => ({
  BLUR_STRENGTHS: {high: 10},
  DEFAULT_BACKGROUND_EFFECT: {type: 'none'},
  DEFAULT_BUILTIN_BACKGROUND_ID: 'default-id',
  loadBackgroundSource: jest.fn(),
}));

jest.mock('Util/logger', () => ({
  getLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('BackgroundEffectsHandler', () => {
  let mockController: any;
  let mockStorage: any;

  afterEach(() => {
    backgroundEffectsStore.getState().setIsFeatureEnabled(false);
    backgroundEffectsStore.getState().setPreferredEffect({type: 'none'});
    backgroundEffectsStore.getState().setMetrics(undefined);
    backgroundEffectsStore.getState().setLastVirtualBackgroundId(DEFAULT_BUILTIN_BACKGROUND_ID);
  });

  beforeEach(() => {
    mockController = {
      isProcessing: jest.fn().mockReturnValue(false),
      start: jest.fn(),
      stop: jest.fn(),
      setMode: jest.fn(),
      setBlurStrength: jest.fn(),
      setBackgroundSource: jest.fn(),
    };

    mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
    };

    const {getStorage} = require('Util/localStorage');
    getStorage.mockReturnValue(mockStorage);
  });

  function createMockStream(withTrack = true): MediaStream {
    return {
      getVideoTracks: () =>
        withTrack
          ? [
              {
                stop: jest.fn(),
              },
            ]
          : [],
    } as unknown as MediaStream;
  }

  it('returns original stream if effect is none', async () => {
    const handler = new BackgroundEffectsHandler(mockController);

    const stream = createMockStream();

    const result = await handler.applyBackgroundEffect(stream);

    expect(result.applied).toBe(false);
    expect(result.media).toBeInstanceOf(ReleasableMediaStream);
  });

  it('returns original stream if no video track exists', async () => {
    const handler = new BackgroundEffectsHandler(mockController);

    const stream = createMockStream(false);

    const result = await handler.applyBackgroundEffect(stream);

    expect(result.applied).toBe(false);
  });

  it('applies blur effect successfully', async () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'} as any);

    const outputTrack = {stop: jest.fn()};

    mockController.start.mockResolvedValue({
      outputTrack,
      stop: jest.fn(),
    });

    const stream = createMockStream();

    const result = await handler.applyBackgroundEffect(stream);

    expect(result.applied).toBe(true);
    expect(mockController.start).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: 'blur',
      }),
    );
    expect(mockController.setMode).not.toHaveBeenCalled();
    expect(mockController.setBlurStrength).not.toHaveBeenCalled();
  });

  it('applies virtual background successfully', async () => {
    const {loadBackgroundSource} = require('Repositories/media/videoBackgroundEffects');

    loadBackgroundSource.mockResolvedValue('mock-bg');

    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({
      type: 'virtual',
      backgroundId: 'bg1',
    });

    const outputTrack = {stop: jest.fn()};

    mockController.start.mockResolvedValue({
      outputTrack,
      stop: jest.fn(),
    });

    const stream = createMockStream();

    const result = await handler.applyBackgroundEffect(stream);

    expect(result.applied).toBe(true);
    expect(loadBackgroundSource).toHaveBeenCalledWith('bg1');
    expect(mockController.start).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: 'virtual',
      }),
    );
    expect(mockController.setMode).not.toHaveBeenCalled();
    expect(mockController.setBackgroundSource).not.toHaveBeenCalled();
  });

  it('handles controller error gracefully', async () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'} as any);

    mockController.start.mockRejectedValue(new Error('fail'));

    const stream = createMockStream();

    const result = await handler.applyBackgroundEffect(stream);

    expect(result.applied).toBe(false);
    expect(mockController.stop).toHaveBeenCalled();
  });

  it('falls back to default virtual when custom has no source', () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({type: 'custom'} as any);

    expect(backgroundEffectsStore.getState().preferredEffect.type).toBe('virtual');
  });

  it('saves feature flag to storage', () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.saveFeatureEnabledStateInStore(true);

    expect(mockStorage.setItem).toHaveBeenCalledWith('video-background-effects-feature-enabled', 'true');
    expect(backgroundEffectsStore.getState().isFeatureEnabled).toBe(true);
  });

  it('reads feature flag from storage', () => {
    mockStorage.getItem.mockReturnValue('true');

    new BackgroundEffectsHandler(mockController);

    expect(backgroundEffectsStore.getState().isFeatureEnabled).toBe(true);
  });

  it('releases processed stream correctly', async () => {
    const handler = new BackgroundEffectsHandler(mockController);
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'} as any);

    const outputTrack = {stop: jest.fn()};
    const stop = jest.fn();

    mockController.start.mockResolvedValue({outputTrack, stop});

    const stream = createMockStream();
    const result = await handler.applyBackgroundEffect(stream);

    result.media.release();

    expect(stop).toHaveBeenCalled();
    expect(outputTrack.stop).toHaveBeenCalled();
  });

  it('reads preferred effect from storage on init', () => {
    mockStorage.getItem.mockImplementation((key: string) => {
      if (key === 'video-background-effects') {
        return JSON.stringify({type: 'virtual', backgroundId: 'bg1'});
      }
      return null;
    });

    new BackgroundEffectsHandler(mockController);

    expect(backgroundEffectsStore.getState().preferredEffect).toEqual({
      type: 'virtual',
      backgroundId: 'bg1',
    });
  });

  it('falls back to default preferred effect when stored value is invalid', () => {
    mockStorage.getItem.mockImplementation((key: string) => {
      if (key === 'video-background-effects') {
        return '{invalid-json';
      }
      return null;
    });

    new BackgroundEffectsHandler(mockController);

    expect(backgroundEffectsStore.getState().preferredEffect).toEqual({type: 'none'});
  });

  it('returns false when saving feature flag fails', () => {
    mockStorage.setItem.mockImplementation(() => {
      throw new Error('storage failed');
    });

    const handler = new BackgroundEffectsHandler(mockController);
    const result = handler.saveFeatureEnabledStateInStore(true);

    expect(result).toBe(false);
    expect(backgroundEffectsStore.getState().isFeatureEnabled).toBe(true);
  });

  it('restores last virtual background ID from storage on init', () => {
    mockStorage.getItem.mockImplementation((key: string) => {
      if (key === 'video-background-effects-last-virtual-id') {
        return 'office-1';
      }
      return null;
    });

    new BackgroundEffectsHandler(mockController);

    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe('office-1');
  });

  it('saves last virtual background ID when a virtual effect is selected', () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({type: 'virtual', backgroundId: 'office-2'});

    expect(mockStorage.setItem).toHaveBeenCalledWith('video-background-effects-last-virtual-id', 'office-2');
    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe('office-2');
  });

  it('does not overwrite last virtual background ID when a non-virtual effect is selected', () => {
    const handler = new BackgroundEffectsHandler(mockController);

    handler.setPreferredBackgroundEffect({type: 'virtual', backgroundId: 'office-2'});
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});

    // lastVirtualBackgroundId in the store should still point to the last virtual one
    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe('office-2');

    // setItem for the virtual ID key should have been called exactly once — only for the virtual selection, not for blur
    const virtualIdCalls = (mockStorage.setItem as jest.Mock).mock.calls.filter(
      ([key]) => key === 'video-background-effects-last-virtual-id',
    );
    expect(virtualIdCalls).toHaveLength(1);
    expect(virtualIdCalls[0][1]).toBe('office-2');
  });
});
