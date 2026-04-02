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

/**
 * Video source wrapper for extracting frames from MediaStreamTrack.
 *
 * This class provides a convenient interface for processing video frames from
 * a MediaStreamTrack (e.g., from getUserMedia or RTCPeerConnection). It:
 * - Creates and manages an HTMLVideoElement for playback
 * - Provides frame callbacks using the most efficient available API
 * - Prefers requestVideoFrameCallback (better timing) over requestAnimationFrame (fallback)
 * - Handles video element lifecycle (play, pause, cleanup)
 */

import {Runtime} from '@wireapp/commons';

import {getLogger, Logger} from 'Util/logger';

/**
 * Callback function invoked for each video frame.
 *
 * @param timestamp - Frame timestamp in seconds (mediaTime for rVFC, currentTime for RAF).
 * @param width - Video width in pixels.
 * @param height - Video height in pixels.
 */
export type FrameCallback = (timestamp: number, width: number, height: number) => void;

/**
 * Wrapper around HTMLVideoElement for frame extraction from MediaStreamTrack.
 *
 * This class manages a hidden video element that plays a MediaStreamTrack and
 * provides callbacks for each frame. It automatically selects the best available
 * frame callback API:
 * - requestVideoFrameCallback: Preferred, provides accurate media timestamps
 * - requestAnimationFrame: Fallback, uses currentTime (less accurate but widely supported)
 */
export class VideoSource {
  /** Logger instance for debugging and warnings. */
  private readonly logger: Logger;
  /** Hidden video element used for frame extraction. */
  private readonly videoEl: HTMLVideoElement;
  /** RequestAnimationFrame handle (used when rVFC unavailable). */
  private rafId: number | null = null;
  /** RequestVideoFrameCallback handle (preferred method). */
  private rVFCHandle: number | null = null;
  /** Last processed frame time (for RAF deduplication). */
  private lastTime = -1;

  /**
   * Creates a new video source from a MediaStreamTrack.
   *
   * Sets up a hidden video element with autoplay, muted, and playsInline attributes
   * to ensure smooth playback without user interaction. The track is attached to
   * the video element via a MediaStream.
   *
   * @param track - MediaStreamTrack to extract frames from (e.g., from getUserMedia).
   */
  constructor(track: MediaStreamTrack) {
    this.logger = getLogger('VideoSource');
    this.videoEl = document.createElement('video');
    // Configure for automatic playback without user interaction
    this.videoEl.autoplay = true;
    this.videoEl.muted = true; // Required for autoplay in most browsers
    this.videoEl.playsInline = true; // Prevents fullscreen on mobile
    // Attach track to video element
    this.videoEl.srcObject = new MediaStream([track]);
  }

  /**
   * Gets the underlying HTMLVideoElement.
   *
   * Useful for direct access to video properties or for attaching event listeners.
   * The element is configured for automatic playback and is hidden from the user.
   *
   * @returns The video element instance.
   */
  public get element(): HTMLVideoElement {
    return this.videoEl;
  }

  /**
   * Starts frame extraction and invokes callback for each frame.
   *
   * This method:
   * 1. Starts video playback
   * 2. Selects the best available frame callback API
   * 3. Invokes the callback for each frame with timestamp and dimensions
   *
   * Frame callback selection:
   * - **requestVideoFrameCallback** (preferred): Provides accurate mediaTime timestamps,
   *   synchronized with video playback. More efficient and accurate than RAF.
   * - **requestAnimationFrame** (fallback): Uses currentTime, less accurate but widely
   *   supported. Includes deduplication to avoid duplicate frames.
   *
   * @param onFrame - Callback function invoked for each video frame.
   */
  public async start(onFrame: FrameCallback): Promise<void> {
    // Start video playback (required for frame extraction)
    await this.videoEl.play().catch((error: unknown) => this.logger.warn('VideoSource play failed', error));

    // Helper functions to get current video dimensions
    const width = () => this.videoEl.videoWidth || 0;
    const height = () => this.videoEl.videoHeight || 0;

    // Prefer requestVideoFrameCallback (more accurate timestamps)
    if ('requestVideoFrameCallback' in this.videoEl) {
      const isFirefox = Runtime.isFirefox();
      const callback = (now: number, metadata: VideoFrameCallbackMetadata) => {
        // VideoFrameCallbackMetadata is a Chromium-based idea and not fully supported in Firefox.
        // we calculate the timestamp in firefox by now value
        // and use mediaTime for accurate frame timing in Chromium-based browsers.
        const timestamp = isFirefox ? now : metadata.mediaTime;
        onFrame(timestamp, width(), height());
        // Schedule next frame callback (rVFC requires re-registration)
        this.rVFCHandle = (this.videoEl as any).requestVideoFrameCallback(callback);
      };
      // Start the callback chain
      this.rVFCHandle = (this.videoEl as any).requestVideoFrameCallback(callback);
      return;
    }

    // Fallback to requestAnimationFrame (less accurate but widely supported)
    const rafLoop = () => {
      const currentTime = this.videoEl.currentTime;
      // Deduplicate: only process if time has changed (avoid duplicate frames)
      if (currentTime !== this.lastTime) {
        this.lastTime = currentTime;
        // Use currentTime as timestamp (less accurate than mediaTime)
        onFrame(currentTime, width(), height());
      }
      // Schedule next frame check
      this.rafId = window.requestAnimationFrame(rafLoop);
    };

    // Start the RAF loop
    this.rafId = window.requestAnimationFrame(rafLoop);
  }

  /**
   * Stops frame extraction and cleans up resources.
   *
   * This method:
   * 1. Cancels any active frame callbacks (rVFC or RAF)
   * 2. Pauses video playback if active
   * 3. Clears the video source and resets the element
   *
   * Should be called when the video source is no longer needed to prevent
   * memory leaks and stop frame processing.
   */
  public stop(): void {
    // Cancel requestVideoFrameCallback if active
    if (this.rVFCHandle !== null && 'cancelVideoFrameCallback' in this.videoEl) {
      (this.videoEl as any).cancelVideoFrameCallback(this.rVFCHandle);
      this.rVFCHandle = null;
    }
    // Cancel requestAnimationFrame if active
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // Pause video playback if still playing
    if (!this.videoEl.paused && !this.videoEl.ended) {
      this.videoEl.pause();
    }
    // Clear video source and reset element state
    this.videoEl.srcObject = null;
    this.videoEl.load();
  }
}
