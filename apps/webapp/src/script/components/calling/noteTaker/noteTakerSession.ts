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

import {isUndefined} from '@sindresorhus/is';

import type {SpeechEngine} from './speechEngine';

import type {Call} from '../../../repositories/calling/Call';
import {MuteState} from '../../../repositories/calling/CallState';

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const CHUNK_SECONDS = 8;
const STREAM_POLL_MS = 500;
const SILENCE_ENERGY = 0.00001;
const MAX_QUEUED_CHUNKS = 15;

export interface TranscriptEntry {
  seconds: number;
  text: string;
}

/** Experimental mixed-audio capture. Never stops or modifies the call's tracks. */
export class NoteTakerSession {
  private context?: AudioContext;
  private processor?: ScriptProcessorNode;
  private timer?: ReturnType<typeof setInterval>;
  private sources = new Map<MediaStreamTrack, {source: MediaStreamAudioSourceNode; gain: GainNode}>();
  private chunks: Float32Array[] = [];
  private sampleCount = 0;
  private capturedSamples = 0;
  private queue: {audio: Float32Array; seconds: number}[] = [];
  private processing?: Promise<void>;
  private stopped = false;
  private muteSubscription?: {dispose(): void};
  private stopPromise?: Promise<void>;
  private cancelled = false;

  constructor(
    private call: Call,
    private engine: SpeechEngine,
    private onEntry: (entry: TranscriptEntry) => void,
    private onError: (error: unknown) => void,
  ) {}

  async start(): Promise<void> {
    const context = new AudioContext({sampleRate: SAMPLE_RATE});
    this.context = context;
    // ScriptProcessor keeps this prototype small; inference runs off the UI thread.
    const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.processor = processor;
    processor.onaudioprocess = event => {
      if (this.stopped) {
        return;
      }
      const audio = event.inputBuffer.getChannelData(0).slice();
      this.chunks.push(audio);
      this.sampleCount += audio.length;
      if (this.sampleCount >= context.sampleRate * CHUNK_SECONDS) {
        this.flush();
      }
    };
    // Output is silence: only listen to the call, never play the capture back.
    processor.connect(context.destination);
    this.syncSources();
    this.muteSubscription = this.call.muteState.subscribe(() => {
      this.syncSources();
    });
    this.timer = setInterval(() => {
      return this.syncSources();
    }, STREAM_POLL_MS);
    await context.resume();
  }

  private syncSources(): void {
    const context = this.context;
    const processor = this.processor;
    if (isUndefined(context) || isUndefined(processor)) {
      return;
    }
    const selfStream = this.call.getSelfParticipant().audioStream();
    const localTracks = new Set(selfStream?.getAudioTracks() ?? []);
    const tracks = new Set(
      this.call.getNoteTakerAudioStreams().flatMap(stream => {
        return stream.getAudioTracks();
      }),
    );
    for (const [track, nodes] of this.sources) {
      if (!tracks.has(track) || track.readyState === 'ended') {
        nodes.source.disconnect();
        nodes.gain.disconnect();
        this.sources.delete(track);
      }
    }
    for (const track of tracks) {
      if (track.readyState === 'ended') {
        continue;
      }
      let nodes = this.sources.get(track);
      if (isUndefined(nodes)) {
        const source = context.createMediaStreamSource(new MediaStream([track]));
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(processor);
        nodes = {source, gain};
        this.sources.set(track, nodes);
      }
      // AVS can mute transmission without disabling the underlying microphone track.
      nodes.gain.gain.value = localTracks.has(track) && this.call.muteState() !== MuteState.NOT_MUTED ? 0 : 1;
    }
  }

  private flush(): void {
    if (this.sampleCount === 0) {
      return;
    }
    const audio = new Float32Array(this.sampleCount);
    let offset = 0;
    for (const chunk of this.chunks) {
      audio.set(chunk, offset);
      offset += chunk.length;
    }
    const seconds = this.capturedSamples / SAMPLE_RATE;
    this.capturedSamples += this.sampleCount;
    this.chunks = [];
    this.sampleCount = 0;
    // Skip near-silence to avoid wasting inference and Whisper's silence hallucinations.
    const energy =
      audio.reduce((sum, sample) => {
        return sum + sample * sample;
      }, 0) / audio.length;
    if (energy < SILENCE_ENERGY) {
      return;
    }
    if (this.queue.length >= MAX_QUEUED_CHUNKS) {
      this.onError(
        new Error('Transcription cannot keep up on this device. Capture stopped; export the partial transcript.'),
      );
      void this.stop();
      return;
    }
    this.queue.push({audio, seconds});
    this.processing ??= this.drain();
  }

  private async drain(): Promise<void> {
    try {
      while (this.queue.length > 0 && !this.cancelled) {
        const item = this.queue.shift();
        if (isUndefined(item)) {
          break;
        }
        const text = (await this.engine.transcribe(item.audio)).trim();
        if (text.length > 0 && !this.cancelled) {
          this.onEntry({seconds: item.seconds, text});
        }
      }
    } catch (error) {
      if (!this.cancelled) {
        this.onError(error);
        this.disconnect();
        this.queue = [];
      }
    } finally {
      this.processing = undefined;
    }
  }

  private disconnect(): void {
    this.stopped = true;
    clearInterval(this.timer);
    this.muteSubscription?.dispose();
    if (!isUndefined(this.processor)) {
      this.processor.onaudioprocess = null;
      this.processor.disconnect();
    }
    for (const {source, gain} of this.sources.values()) {
      source.disconnect();
      gain.disconnect();
    }
    this.sources.clear();
    void this.context?.close();
    this.context = undefined;
  }

  stop(): Promise<void> {
    if (isUndefined(this.stopPromise)) {
      this.disconnect();
      this.flush();
      this.stopPromise = (async (): Promise<void> => {
        await this.processing;
        this.engine.dispose();
      })();
    }
    return this.stopPromise;
  }

  cancel(): void {
    this.cancelled = true;
    this.disconnect();
    this.queue = [];
    this.engine.dispose();
  }
}
