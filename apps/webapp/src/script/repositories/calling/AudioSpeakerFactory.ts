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

import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {getLogger, Logger} from 'Util/logger';

export class GlobalAudioContext {
  private static context?: AudioContext;

  static get(): AudioContext {
    if (!this.context || this.context.state === 'closed') {
      this.context = new AudioContext();
    }

    return this.context;
  }

  static async resume(): Promise<void> {
    const context = this.get();
    //const outputDeviceId = mediaDevicesStore.getState().audio.output.selectedId;
    //context.setSinkId(outputDeviceId);

    if (context.state !== 'running') {
      console.log("### about to await context.resume");
      await context.resume();
      console.log("### done awaiting context.resume");
    }
  }
}


export class AudioSpeakerFactory {
  private static readonly logger: Logger = getLogger('AudioSpeakerFactory');
  private static baseElement: HTMLElement | null = document.getElementById('calling-audio-speaker-elements');
  static counter = 0;

  public static createNewCallingAudioSpeaker(stream: MediaStream): HTMLAudioElement {
    AudioSpeakerFactory.initBaseElement();

    if (!AudioSpeakerFactory.baseElement) {
      AudioSpeakerFactory.logger.error('No audio base element exist in DOM!');
      throw new Error('Audio element could not be crated!');
    }
    console.log('### media devices', mediaDevicesStore.getState());
    console.log('### setting sink id', mediaDevicesStore.getState().audio.output.selectedId);
    //context.setSinkId(mediaDevicesStore.getState().audio.output.selectedId);


    console.log('### stream', stream, stream.id);
    stream.getTracks().forEach(track => {
      console.log('### src track', track.kind);
    });

    const context = GlobalAudioContext.get();
    console.log('### context state', context.state);
    console.log('### global context:', context);
    const source = context.createMediaStreamSource(stream);
    //const gainNode = context.createGain();
    //gainNode.gain.value = 2.0;
    const dest = context.createMediaStreamDestination();

    const analyser = context.createAnalyser();
    const data = new Float32Array(analyser.fftSize);

    setInterval(() => {
      const track = stream.getAudioTracks()[0];
      console.log("###", {
        id: track.id,
        readyState: track.readyState,
        muted: track.muted,
        enabled: track.enabled,
      });
    }, 1000);

    //source.connect(gainNode).connect(dest);
    source.connect(context.destination);

    console.log('### context dest', context.destination);
    console.log('### len audio tracks', stream.getAudioTracks().length);
    console.log('### ready state of 1st audio track', stream.getAudioTracks()[0]?.readyState);



    dest.stream.getAudioTracks().forEach(track => {
      console.log('### track', track.enabled);
      console.log('### track', track.readyState);
      console.log('### track', track.muted);
    });



    AudioSpeakerFactory.logger.log('Add new audio speaker');
    // const audioElement = new Audio();
    //audioElement.srcObject = dest.stream;
    console.log(audioElement);
    // audioElement.srcObject = stream;
    /*
     * audioElement.play().catch((error: unknown) => {
      AudioSpeakerFactory.logger.error('Audio play failed', error);
    });
    AudioSpeakerFactory.baseElement.appendChild(audioElement);

    return audioElement;
    */
  }

  private static initBaseElement(): void {
    if (!AudioSpeakerFactory.baseElement) {
      AudioSpeakerFactory.baseElement = document.getElementById('calling-audio-speaker-elements');
    }
  }
}
