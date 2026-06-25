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

import {setTimeout} from 'worker-timers';

import {getSafeLogger} from 'Repositories/media/backgroundeffects/helper/logger';

interface MediaStreamTrackProcessor {
  readable: ReadableStream;
}

declare global {
  interface Window {
    MediaStreamTrackProcessor: new ({track}: {track: MediaStreamTrack}) => MediaStreamTrackProcessor;
  }
}

class FallbackProcessor implements MediaStreamTrackProcessor {
  readonly logger = getSafeLogger('FallbackProcessor');
  readonly readable: ReadableStream;

  constructor({track}: {track: MediaStreamTrack}) {
    if (!track) {
      throw new Error('MediaStreamTrack is required');
    }
    if (track.kind !== 'video') {
      throw new Error('MediaStreamTrack must be video');
    }
    let running = true;
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.srcObject = new MediaStream([track]);
    const canvas = new OffscreenCanvas(1, 1);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
    let timestamp = 0;
    let frameDuration = 1000 / 15;
    const close = () => {
      video.pause();
      video.srcObject = null;
      video.src = '';
    };
    this.readable = new ReadableStream({
      start: async () => {
        await this.startVideo(video);
        const configuredFrameRate = track.getSettings().frameRate;

        if (configuredFrameRate && configuredFrameRate > 0) {
          frameDuration = 1000 / configuredFrameRate;
        }
        timestamp = performance.now();
        this.logger.log(`[virtual-background] processor start frameDuration=${frameDuration}`);
      },
      pull: async controller => {
        if (!running) {
          controller.close();
          close();
          return;
        }
        const delta = performance.now() - timestamp;
        if (delta < frameDuration) {
          await new Promise(r => setTimeout(r, frameDuration - delta));
        }
        timestamp = performance.now();
        const width = video.videoWidth;
        const height = video.videoHeight;

        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || width === 0 || height === 0) {
          return;
        }

        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        ctx.drawImage(video, 0, 0);
        try {
          controller.enqueue(new VideoFrame(canvas, {timestamp: Math.round(performance.now() * 1000)})); // µs
        } catch (e: unknown) {
          running = false;
          close();
        }
      },
      cancel: reason => {
        this.logger.log(`[virtual-background] video processor cancelled: ${reason}`);
        running = false;
        close();
      },
    });
    const trackStop = track.stop.bind(track);
    track.stop = () => {
      trackStop();
      running = false;
    };
  }

  private async startVideo(video: HTMLVideoElement): Promise<void> {
    const waitForLoadedData = (): Promise<void> => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          video.removeEventListener('loadeddata', onLoaded);
          video.removeEventListener('error', onError);
        };

        const onLoaded = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(video.error ?? new Error('Video failed to load'));
        };

        video.addEventListener('loadeddata', onLoaded, {once: true});
        video.addEventListener('error', onError, {once: true});
      });
    };

    const loaded = waitForLoadedData();

    try {
      await video.play();
      await loaded;
    } catch (error) {
      video.pause();
      video.srcObject = null;
      throw error;
    }
  }
}

const TrackProcessor =
  'MediaStreamTrackProcessor' in globalThis ? (globalThis as any).MediaStreamTrackProcessor : FallbackProcessor;
export {TrackProcessor};
