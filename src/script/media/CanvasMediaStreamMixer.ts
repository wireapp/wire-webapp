/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export class CanvasMediaStreamMixer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly img: HTMLImageElement;
  public readonly videoElements: Map<string, HTMLVideoElement> = new Map<string, HTMLVideoElement>();
  // moveable Rect
  private readonly videoRect: Rect;
  private offsetX: number;
  private offsetY: number;

  private smallOffsetX: number = 0;
  private smallOffsetY: number = 0;


  private mediaStreams: Map<string, MediaStream> = new Map<string, MediaStream>();
  private audioContext: any;
  private audioDestination: any;
  private audioSources?: Array<any>;
  private gainNode?: GainNode;
  private useGainNode = false;

  constructor(elementId: string, img: HTMLImageElement) {
    this.img = img;
    this.canvas = window.document.getElementById(elementId) as HTMLCanvasElement;
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.context = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    this.context.imageSmoothingEnabled = true;

    const BB = this.canvas.getBoundingClientRect();
    this.offsetX = BB.left;
    this.offsetY = BB.top;


    this.videoRect = {
      x: 75 - 15,
      y: 50 - 15,
      width: 30,
      height: 30,
      fill: '#444444',
      isDragging: false,
    } as Rect;
  }

  start() {
    this.drawScreen();
  }

  drawScreen() {
    //Background
    if (this.videoElements.size == 0) {
      // this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.videoElements.has('bigVideo')) {
      const bigVideo = this.videoElements.get('bigVideo') as HTMLVideoElement;
      this.context.drawImage(bigVideo, 0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.videoElements.has('smallVideo')) {
      const smallVideo = this.videoElements.get('smallVideo') as HTMLVideoElement;

      const cam_w = smallVideo.videoWidth;
      const cam_h = smallVideo.videoHeight;
      const cam_ratio = cam_w / cam_h;
      const out_h = this.canvas.height / 3;
      const out_w = out_h * cam_ratio;
      this.context.drawImage(
        smallVideo,
        this.canvas.width - out_w + this.smallOffsetX,
        this.canvas.height - out_h + this.smallOffsetY,
        out_w,
        out_h,
      );
    }

    window.requestAnimationFrame(() => {
      this.drawScreen();
    });
  }

  getStream(): MediaStream {
    return this.canvas.captureStream(60);
  }

  getMixedStream() {
    const mixedAudioStream = this.getMixedAudioStream();
    const mixedVideoStream = this.canvas.captureStream(60);
    if (mixedAudioStream) {
      mixedAudioStream
        .getTracks()
        .filter(t => t.kind === 'audio')
        .forEach(track => {
          mixedVideoStream.addTrack(track);
        });
    }
    return mixedVideoStream;
  }

  private getMixedAudioStream(): MediaStream | undefined {
    // via: @pehrsons
    if (this.audioContext == undefined) {
      this.audioContext = this.getAudioContext();
    }
    this.audioSources = new Array<any>();
    if (this.useGainNode) {
      this.gainNode = this.audioContext.createGain();
      // @ts-ignore
      this.gainNode.connect(this.audioContext.destination);
      // @ts-ignore
      this.gainNode.gain.value = 0; // don't hear self
    }

    let audioTracksLength = 0;
    this.mediaStreams.forEach(stream => {
      if (stream.getTracks().filter(t => t.kind === 'audio').length === 0) {
        return;
      }
      audioTracksLength++;
      const _audioSource = this.audioContext.createMediaStreamSource(stream);
      if (this.gainNode !== undefined) {
        _audioSource.connect(this.gainNode);
      }
      // @ts-ignore
      this.audioSources.push(_audioSource);
    });

    if (!audioTracksLength) {
      return undefined;
    }
    this.audioDestination = this.audioContext.createMediaStreamDestination();
    this.audioSources.forEach(_audioSource => {
      _audioSource.connect(this.audioDestination);
    });
    return this.audioDestination.stream;
  }

  getAudioContext(): any {
    if (typeof AudioContext !== 'undefined') {
      return new AudioContext();
    } else if (typeof (<any>window).webkitAudioContext !== 'undefined') {
      return new (<any>window).webkitAudioContext();
    } else if (typeof (<any>window).mozAudioContext !== 'undefined') {
      return new (<any>window).mozAudioContext();
    }
  }

  setMainStreamVideoElement(stream: MediaStream): void {
    const video = document.getElementById('bigVideo') as HTMLVideoElement;
    video.srcObject = stream;
    video.play();
    this.appendStream(stream);
    this.videoElements.set('bigVideo', video);
  }

  setSmallStreamVideoElement(stream: MediaStream): void {
    const video = document.getElementById('smallVideo') as HTMLVideoElement;
    video.srcObject = stream;
    video.play();
    this.appendStream(stream);
    this.videoElements.set('smallVideo', video);
  }

  appendStream(stream: MediaStream) {
    if (this.mediaStreams.has(stream.id)) {
      return;
    }
    this.mediaStreams.set(stream.id, stream);
    if (stream.getTracks().filter(t => t.kind === 'audio').length > 0 && this.audioContext) {
      const audioSource = this.audioContext.createMediaStreamSource(stream);
      audioSource.connect(this.audioDestination);
      this.audioSources?.push(audioSource);
    }
  }

  removeStream(stream: MediaStream) {
    if (this.mediaStreams.has(stream.id)) {
      this.mediaStreams.delete(stream.id);
    }
  }

  releaseStreams(): void {
    if (this.gainNode !== undefined) {
      this.gainNode.disconnect();
      // @ts-ignore
      this.gainNode = null;
    }

    if (this.audioSources?.length) {
      this.audioSources.forEach(source => {
        source.disconnect();
      });
      this.audioSources = [];
    }

    if (this.audioDestination !== undefined) {
      this.audioDestination.disconnect();
      this.audioDestination = null;
    }

    if (this.audioContext !== undefined) {
      this.audioContext.close();
    }

    this.audioContext = undefined;

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  async togglePictureInPicture() {
    // Close Picture-in-Picture window if any.
    if (window.documentPictureInPicture.window) {
      window.documentPictureInPicture.window.close();
      return;
    }

    window.documentPictureInPicture.addEventListener('enter', (event) => {

      let oldX = event.window.screenX,
        oldY = event.window.screenY;
      const smallVideo = event.window;
      const interval = setInterval(() => {
        if (oldX != smallVideo.screenX || oldY != smallVideo.screenY) {
          this.smallOffsetX = smallVideo.screenX;
          this.smallOffsetY = smallVideo.screenY;
          console.log('#### X',  this.smallOffsetX, smallVideo.offsetX);
          console.log('#### Y',  this.smallOffsetY, smallVideo.offsetY);

        }

        oldX = smallVideo.screenX;
        oldY = smallVideo.screenY;
      }, 500);
    });

    // Open a Picture-in-Picture window.
    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 640,
      height: 360,
    });

    // Copy all style sheets.
    [...document.styleSheets].forEach(styleSheet => {
      try {
        const cssRules = [...styleSheet.cssRules].map(rule => rule.cssText).join('');
        const style = document.createElement('style');

        style.textContent = cssRules;
        pipWindow.document.head.appendChild(style);
      } catch (e) {
        const link = document.createElement('link');

        link.rel = 'stylesheet';
        link.type = styleSheet.type;
        link.media = styleSheet.media;
        link.href = styleSheet.href;
        pipWindow.document.head.appendChild(link);
      }
    });

    // Move video to the Picture-in-Picture window and make it full page.
    const video = document.querySelector('#smallVideo');
    pipWindow.document.body.append(video);
    video?.classList.toggle('fullpage', true);


    // Listen for the PiP closing event to move the video back.
    pipWindow.addEventListener('pagehide', event => {
      const videoContainer = document.querySelector('#videoContainer');
      const pipVideo = event.target.querySelector('#video');
      pipVideo.classList.toggle('fullpage', false);
      videoContainer?.append(pipVideo);
    });


    //   const pipWindow = event.window;
    // pipWindow.addEventListener('enter', event => {
    //   console.log('######    ---- enter', event);
    // });

    window.addEventListener("click", function(event) {
    });


    pipWindow.addEventListener('touchstart', (e: MouseEvent) => {
      console.log('######    ---- touchstart', e);
    });

    pipWindow.addEventListener('mouseup', (e: MouseEvent) => {
      console.log('######    ---- onmouseup', e);
    });

    pipWindow.addEventListener('mousemove', (e: MouseEvent) => {
      //console.log('######    ---- onmousedown', e);
    });
  }
}

interface GridParams {
  cols: number;
  rows: number;
  xPad: number;
  yPad: number;
  partWidth: number;
  partHeight: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  isDragging: boolean;
}
