/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {getLogger, Logger} from 'Util/Logger';

export type FrameCallback = (timestamp: number, width: number, height: number) => void;

export class VideoSource {
  private readonly logger: Logger;
  private readonly videoEl: HTMLVideoElement;
  private rafId: number | null = null;
  private rVFCHandle: number | null = null;
  private lastTime = -1;

  constructor(private readonly track: MediaStreamTrack) {
    this.logger = getLogger('VideoSource');
    this.videoEl = document.createElement('video');
    this.videoEl.autoplay = true;
    this.videoEl.muted = true;
    this.videoEl.playsInline = true;
    this.videoEl.srcObject = new MediaStream([track]);
  }

  public get element(): HTMLVideoElement {
    return this.videoEl;
  }

  public async start(onFrame: FrameCallback): Promise<void> {
    await this.videoEl.play().catch(error => this.logger.warn('VideoSource play failed', error));

    const width = () => this.videoEl.videoWidth || 0;
    const height = () => this.videoEl.videoHeight || 0;

    if ('requestVideoFrameCallback' in this.videoEl) {
      const callback = (now: number, metadata: VideoFrameCallbackMetadata) => {
        onFrame(metadata.mediaTime, width(), height());
        this.rVFCHandle = (this.videoEl as any).requestVideoFrameCallback(callback);
      };
      this.rVFCHandle = (this.videoEl as any).requestVideoFrameCallback(callback);
      return;
    }

    const rafLoop = () => {
      const currentTime = this.videoEl.currentTime;
      if (currentTime !== this.lastTime) {
        this.lastTime = currentTime;
        onFrame(currentTime, width(), height());
      }
      this.rafId = window.requestAnimationFrame(rafLoop);
    };

    this.rafId = window.requestAnimationFrame(rafLoop);
  }

  public stop(): void {
    if (this.rVFCHandle !== null && 'cancelVideoFrameCallback' in this.videoEl) {
      (this.videoEl as any).cancelVideoFrameCallback(this.rVFCHandle);
      this.rVFCHandle = null;
    }
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (!this.videoEl.paused && !this.videoEl.ended) {
      this.videoEl.pause();
    }
    this.videoEl.srcObject = null;
    this.videoEl.load();
  }
}
