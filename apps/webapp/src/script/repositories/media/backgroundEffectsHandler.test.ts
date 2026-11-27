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
import type {BackgroundEffectsSession, BackgroundSessionOptions} from './longpipeBackgroundEffects';
import {backgroundEffectsStore} from './useBackgroundEffectsStore';
import {DEFAULT_BUILTIN_BACKGROUND_ID, loadBackgroundSource} from './VideoBackgroundEffects';
import {isBackgroundEffectsSupported} from './backgroundEffectsSupport';

jest.mock('./backgroundEffectsSupport', () => {
  return {
    isBackgroundEffectsSupported: jest.fn(() => {
      return true;
    }),
  };
});
jest.mock('./VideoBackgroundEffects', () => {
  return {
    DEFAULT_BACKGROUND_EFFECT: {type: 'none'},
    DEFAULT_BUILTIN_BACKGROUND_ID: 'default-id',
    loadBackgroundSource: jest.fn(),
  };
});

describe('BackgroundEffectsHandler with Longpipe', () => {
  const tracks: MediaStreamTrack[] = [];
  const createStream = (): MediaStream => {
    const track = {kind: 'video', stop: jest.fn()} as unknown as MediaStreamTrack;
    tracks.push(track);
    return {
      getVideoTracks: () => {
        return [track];
      },
      getTracks: () => {
        return [track];
      },
    } as unknown as MediaStream;
  };
  const createSession = jest.fn<Promise<BackgroundEffectsSession>, [MediaStreamTrack, BackgroundSessionOptions]>();
  let session: BackgroundEffectsSession;
  let handler: BackgroundEffectsHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    backgroundEffectsStore.setState(backgroundEffectsStore.getInitialState(), true);
    (isBackgroundEffectsSupported as jest.Mock).mockReturnValue(true);
    session = {
      stream: createStream(),
      onTrackChanged: undefined,
      setBackground: jest.fn().mockResolvedValue(undefined),
      setQuality: jest.fn().mockResolvedValue(undefined),
      setMaximumLongEdge: jest.fn().mockResolvedValue(undefined),
      release: jest.fn(),
    };
    createSession.mockResolvedValue(session);
    handler = new BackgroundEffectsHandler(createSession);
  });
  afterEach(() => {
    tracks.splice(0).forEach(track => {
      track.stop();
    });
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('returns the original stream with effects off or no camera track', async () => {
    const stream = createStream();
    expect((await handler.applyBackgroundEffect(stream)).media.stream).toBe(stream);
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'low'});
    expect((await handler.applyBackgroundEffect(new MediaStream())).applied).toBe(false);
    expect(createSession).not.toHaveBeenCalled();
  });

  it.each(['low', 'high'] as const)('preserves the %s blur selection and starts adaptive resolution', async level => {
    handler.setPreferredBackgroundEffect({type: 'blur', level});
    const result = await handler.applyBackgroundEffect(createStream());
    expect(result.applied).toBe(true);
    expect(result.media).toBeInstanceOf(ReleasableMediaStream);
    expect(result.media.stream).toBe(session.stream);
    expect(createSession).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({background: {blur: {strength: level}}, quality: 'auto'}),
    );
  });

  it('updates effects on the same camera without recreating the session', async () => {
    const stream = createStream();
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'low'});
    const first = await handler.applyBackgroundEffect(stream);
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});
    const second = await handler.applyBackgroundEffect(stream);
    expect(second.media).toBe(first.media);
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(session.setBackground).toHaveBeenCalledWith({blur: {strength: 'high'}});
  });

  it('loads the selected background image for Longpipe', async () => {
    const image = new Image();
    (loadBackgroundSource as jest.Mock).mockResolvedValue({type: 'image', media: image, url: '/bg.png'});
    handler.setPreferredBackgroundEffect({type: 'virtual', backgroundId: 'office-1'});
    await handler.applyBackgroundEffect(createStream());
    expect(loadBackgroundSource).toHaveBeenCalledWith('office-1');
    expect(createSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({background: image}));
    expect(backgroundEffectsStore.getState().lastVirtualBackgroundId).toBe('office-1');
  });

  it('preserves custom background images', async () => {
    const image = new Image();
    handler.setPreferredBackgroundEffect({type: 'custom'}, {type: 'image', url: '/custom.png', media: image});
    await handler.applyBackgroundEffect(createStream());
    expect(createSession).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({background: image}));
  });

  it('uses the default image when a custom background has no source', () => {
    handler.setPreferredBackgroundEffect({type: 'custom'});
    expect(backgroundEffectsStore.getState().preferredEffect).toEqual({
      type: 'virtual',
      backgroundId: DEFAULT_BUILTIN_BACKGROUND_ID,
    });
  });

  it('does not reuse an old camera session or let its release clear the new session', async () => {
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});
    const first = await handler.applyBackgroundEffect(createStream());
    const nextSession = {...session, stream: createStream(), release: jest.fn()};
    createSession.mockResolvedValue(nextSession);
    const nextStream = createStream();
    const second = await handler.applyBackgroundEffect(nextStream);
    first.media.release();
    expect(session.release).toHaveBeenCalledTimes(1);
    expect((await handler.applyBackgroundEffect(nextStream)).media).toBe(second.media);
    expect(createSession).toHaveBeenCalledTimes(2);
  });

  it('forwards replacement tracks to the calling integration', async () => {
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'low'});
    const result = await handler.applyBackgroundEffect(createStream());
    result.media.onTrackChanged = jest.fn();
    session.onTrackChanged?.();
    expect(result.media.onTrackChanged).toHaveBeenCalled();
    result.media.release();
    expect(session.release).toHaveBeenCalled();
  });

  it('falls back to the original camera if Longpipe cannot initialize', async () => {
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});
    createSession.mockRejectedValue(new Error('No backend'));
    const stream = createStream();
    expect((await handler.applyBackgroundEffect(stream)).media.stream).toBe(stream);
  });

  it('persists the performance panel and effect selection using the existing keys', () => {
    handler.savePerformancePanelEnabledStateInStore(true);
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});
    jest.advanceTimersByTime(500);
    expect(localStorage.getItem('video-background-effects-feature-enabled')).toBe('true');
    expect(JSON.parse(localStorage.getItem('video-background-effects') ?? '{}')).toEqual({type: 'blur', level: 'high'});
  });

  it('routes existing quality preferences to output resolution limits', async () => {
    handler.setPreferredBackgroundEffect({type: 'blur', level: 'high'});
    await handler.applyBackgroundEffect(createStream());
    handler.setQualityTier('performance');
    expect(session.setMaximumLongEdge).toHaveBeenCalledWith(640);
    expect(handler.getQuality()).toBe('auto');
    expect(backgroundEffectsStore.getState().qualityTier).toBe('performance');
  });
});
