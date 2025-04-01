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

// Canvas configuration
const DEFAULT_CANVAS_WIDTH = 1920;
const DEFAULT_CANVAS_HEIGHT = 1080;
const SCREEN_SHARE_FPS = 5; // Native screen share frame rate
const FRAME_RATE = 30; // Output stream frame rate

// PiP configuration
const PIP_VIDEO_ID = 'smallVideo';
const PIP_WINDOW_WIDTH = 320;
const PIP_WINDOW_HEIGHT = 180;

// Video overlay configuration
const CAMERA_OVERLAY_SCALE = 4; // divider for main canvas height
const CAMERA_OVERLAY_PADDING = 20;

// Update these constants
const POSITION_THROTTLE = 100; // Increase throttle to 100ms
const ANIMATION_FRAME_RATE = 1000 / SCREEN_SHARE_FPS; // Match screen share's native frame rate

// Add new constant for position smoothing
const POSITION_SMOOTHING = 0.5; // Value between 0 and 1 for smooth transitions

// Add these constants
const SHADOW_BLUR = 10;
const SHADOW_COLOR = 'rgba(0,0,0,0.5)';

export class CanvasMediaStreamMixer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private animationFrame: number | null = null;
  private smallOffsetX = 0;
  private smallOffsetY = 0;
  private isPipActive = false;
  private lastScreenFrameTime = 0;

  // Add properties for smooth position tracking
  private targetOffsetX = 0;
  private targetOffsetY = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    // Optimize canvas context for video mixing
    this.context = this.canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    })!;

    // Enable high-quality image scaling
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  async startMixing(screenShare: MediaStream, camera: MediaStream): Promise<MediaStream> {
    try {
      this.screenVideo = this.createVideoElement(screenShare, {
        muted: true,
        autoplay: true,
      });

      this.cameraVideo = this.createVideoElement(camera, {
        muted: true,
        autoplay: true,
        id: PIP_VIDEO_ID,
      });
      document.body.appendChild(this.cameraVideo);

      // Wait for both videos to be ready
      await Promise.all([this.screenVideo.play(), this.cameraVideo.play()]);

      // Set canvas dimensions to match screen share's native resolution
      const screenTrack = screenShare.getVideoTracks()[0];
      const settings = screenTrack.getSettings();
      this.canvas.width = settings.width || DEFAULT_CANVAS_WIDTH;
      this.canvas.height = settings.height || DEFAULT_CANVAS_HEIGHT;

      this.startAnimation();
      await this.togglePictureInPicture();

      // Create and configure output stream
      const outputStream = this.canvas.captureStream(FRAME_RATE);
      const [videoTrack] = outputStream.getVideoTracks();

      // Apply constraints that preserve the original resolution
      await videoTrack.applyConstraints({
        width: {ideal: this.canvas.width},
        height: {ideal: this.canvas.height},
        frameRate: {ideal: FRAME_RATE},
      });

      return outputStream;
    } catch (error) {
      this.releaseStreams();
      throw error;
    }
  }

  private createVideoElement(
    stream: MediaStream,
    options: {muted?: boolean; autoplay?: boolean; id?: string} = {},
  ): HTMLVideoElement {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = options.muted ?? false;
    if (options.autoplay) {
      video.playsInline = true;
    }
    if (options.id) {
      video.id = options.id;
    }
    return video;
  }

  private startAnimation() {
    const mixFrames = () => {
      if (!this.screenVideo || !this.cameraVideo) {
        return;
      }

      const now = performance.now();

      // Update both screen and camera content at 5 FPS
      if (now - this.lastScreenFrameTime >= ANIMATION_FRAME_RATE) {
        this.lastScreenFrameTime = now;

        try {
          // Clear and draw black background
          this.context.fillStyle = '#000000';
          this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

          // Draw screen share at native resolution
          if (this.screenVideo.readyState >= this.screenVideo.HAVE_CURRENT_DATA) {
            // Create temporary canvas for screen content
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            const tempContext = tempCanvas.getContext('2d', {
              alpha: false,
              desynchronized: true,
            });

            if (tempContext) {
              tempContext.drawImage(this.screenVideo, 0, 0, this.canvas.width, this.canvas.height);
              this.context.drawImage(tempCanvas, 0, 0);
            }
          }

          // Update camera overlay position
          if (this.isPipActive) {
            this.smallOffsetX += (this.targetOffsetX - this.smallOffsetX) * POSITION_SMOOTHING;
            this.smallOffsetY += (this.targetOffsetY - this.smallOffsetY) * POSITION_SMOOTHING;
          }

          // Draw camera overlay
          if (this.cameraVideo.readyState >= this.cameraVideo.HAVE_CURRENT_DATA) {
            const out_h = this.canvas.height / CAMERA_OVERLAY_SCALE;
            const out_w = (this.cameraVideo.videoWidth / this.cameraVideo.videoHeight) * out_h;

            const x = this.isPipActive
              ? Math.round(this.canvas.width - out_w + this.smallOffsetX)
              : Math.round(this.canvas.width - out_w - CAMERA_OVERLAY_PADDING);

            const y = this.isPipActive ? Math.round(this.smallOffsetY) : CAMERA_OVERLAY_PADDING;

            this.context.save();
            this.context.shadowColor = SHADOW_COLOR;
            this.context.shadowBlur = SHADOW_BLUR;
            this.context.drawImage(this.cameraVideo, x, y, out_w, out_h);
            this.context.restore();
          }
        } catch (error) {
          console.error('Error in mixFrames:', error);
        }
      }

      this.animationFrame = requestAnimationFrame(mixFrames);
    };

    this.animationFrame = requestAnimationFrame(mixFrames);
  }

  async togglePictureInPicture(): Promise<void> {
    if (!document.pictureInPictureEnabled || !window.documentPictureInPicture) {
      console.warn('Picture-in-Picture not supported');
      return;
    }

    try {
      if (window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
        this.resetPipState();
        return;
      }

      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: PIP_WINDOW_WIDTH,
        height: PIP_WINDOW_HEIGHT,
      });

      this.setupPipWindow(pipWindow);
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture mode:', error);
      this.resetPipState();
    }
  }

  private setupPipWindow(pipWindow: Window) {
    pipWindow.document.body.style.cssText = `
      margin: 0;
      padding: 0;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: black;
    `;

    const video = document.getElementById(PIP_VIDEO_ID) as HTMLVideoElement;
    if (!video) {
      throw new Error('Camera video element not found');
    }

    video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    `;

    pipWindow.document.body.appendChild(video);
    this.isPipActive = true;

    let lastUpdate = 0;

    const updatePosition = () => {
      const now = performance.now();
      if (now - lastUpdate < POSITION_THROTTLE) {
        return;
      }

      this.targetOffsetX = pipWindow.screenX - window.screenX;
      this.targetOffsetY = pipWindow.screenY - window.screenY;
      lastUpdate = now;
    };

    // Use setInterval instead of RAF for position updates
    const positionInterval = setInterval(updatePosition, POSITION_THROTTLE);

    pipWindow.addEventListener('pagehide', () => {
      clearInterval(positionInterval);
      this.resetPipState();

      const videoContainer = document.getElementById('videoContainer');
      if (video && videoContainer && !videoContainer.contains(video)) {
        videoContainer.appendChild(video);
      }
    });
  }

  private resetPipState() {
    this.isPipActive = false;
    this.smallOffsetX = 0;
    this.smallOffsetY = 0;
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
  }

  releaseStreams(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (window.documentPictureInPicture?.window) {
      window.documentPictureInPicture.window.close();
    }

    [this.screenVideo, this.cameraVideo].forEach(video => {
      if (video) {
        const tracks = video.srcObject as MediaStream;
        tracks?.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
      }
    });

    this.screenVideo = null;
    this.cameraVideo = null;
    this.resetPipState();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
