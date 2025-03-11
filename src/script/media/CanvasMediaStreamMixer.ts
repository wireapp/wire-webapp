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

const WIDTH = 1920;
const HEIGHT = 1080;
const PIP_VIDEO_ID = 'smallVideo';

export class CanvasMediaStreamMixer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private screenVideo: HTMLVideoElement | null = null;
  private cameraVideo: HTMLVideoElement | null = null;
  private animationFrame: number | null = null;
  private smallOffsetX = 0;
  private smallOffsetY = 0;
  private isPipActive = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.display = 'none';
    document.body.appendChild(this.canvas);

    this.context = this.canvas.getContext('2d')!;
  }

  async startMixing(screenShare: MediaStream, camera: MediaStream): Promise<MediaStream> {
    this.screenVideo = document.createElement('video');
    this.screenVideo.srcObject = screenShare;
    this.screenVideo.muted = true;
    await this.screenVideo.play();

    // Handle screen share track ending
    screenShare.getVideoTracks().forEach(track => {
      track.onended = () => {
        this.releaseStreams();
      };
    });

    this.cameraVideo = document.createElement('video');
    this.cameraVideo.srcObject = camera;
    this.cameraVideo.muted = true;
    this.cameraVideo.id = PIP_VIDEO_ID;
    document.body.appendChild(this.cameraVideo);
    await this.cameraVideo.play();

    const mixFrames = () => {
      if (this.screenVideo && this.cameraVideo) {
        // Draw screen share
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.screenVideo, 0, 0, this.canvas.width, this.canvas.height);

        // Draw camera overlay
        const PADDING = 20;
        const out_h = this.canvas.height / 4;
        const out_w = (this.cameraVideo.videoWidth / this.cameraVideo.videoHeight) * out_h;

        const x = this.isPipActive
          ? this.canvas.width - out_w + this.smallOffsetX
          : this.canvas.width - out_w - PADDING;

        const y = this.isPipActive ? this.smallOffsetY : PADDING;

        this.context.drawImage(this.cameraVideo, x, y, out_w, out_h);
      }
      this.animationFrame = requestAnimationFrame(mixFrames);
    };

    mixFrames();
    await this.togglePictureInPicture();
    return this.canvas.captureStream(60);
  }

  async togglePictureInPicture(): Promise<void> {
    if (!document.pictureInPictureEnabled || !window.documentPictureInPicture) {
      console.warn('Picture-in-Picture not supported');
      return;
    }

    try {
      if (window.documentPictureInPicture.window) {
        window.documentPictureInPicture.window.close();
        this.isPipActive = false;
        this.smallOffsetX = 0;
        this.smallOffsetY = 0;
        return;
      }

      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 320,
        height: 180,
      });

      pipWindow.document.body.style.cssText = `
        margin: 0;
        padding: 0;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: black;
      `;

      const video = document.getElementById('smallVideo') as HTMLVideoElement;
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

      // Track PiP window position
      const updatePosition = () => {
        const mainWindow = window;
        this.smallOffsetX = pipWindow.screenX - mainWindow.screenX;
        this.smallOffsetY = pipWindow.screenY - mainWindow.screenY;
      };

      // Update position immediately and start tracking
      updatePosition();
      const positionInterval = setInterval(updatePosition, 16); // ~60fps

      pipWindow.addEventListener('pagehide', () => {
        clearInterval(positionInterval);
        this.isPipActive = false;
        this.smallOffsetX = 0;
        this.smallOffsetY = 0;

        const videoContainer = document.getElementById('videoContainer');
        if (video && videoContainer && !videoContainer.contains(video)) {
          videoContainer.appendChild(video);
        }
      });
    } catch (error) {
      console.error('Failed to enter Picture-in-Picture mode:', error);
      this.isPipActive = false;
      this.smallOffsetX = 0;
      this.smallOffsetY = 0;
    }
  }

  releaseStreams(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (window.documentPictureInPicture?.window) {
      window.documentPictureInPicture.window.close();
    }

    if (this.screenVideo) {
      const screenTracks = this.screenVideo.srcObject as MediaStream;
      screenTracks?.getTracks().forEach(track => track.stop());
      this.screenVideo.srcObject = null;
      this.screenVideo = null;
    }

    if (this.cameraVideo) {
      const cameraTracks = this.cameraVideo.srcObject as MediaStream;
      cameraTracks?.getTracks().forEach(track => track.stop());
      this.cameraVideo.srcObject = null;
      if (document.body.contains(this.cameraVideo)) {
        document.body.removeChild(this.cameraVideo);
      }
      this.cameraVideo = null;
    }

    this.isPipActive = false;
    this.smallOffsetX = 0;
    this.smallOffsetY = 0;
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
