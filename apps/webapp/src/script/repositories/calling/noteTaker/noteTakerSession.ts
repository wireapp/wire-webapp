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

import type {Clock} from '@enormora/clock/clock';
import {isUndefined} from '@sindresorhus/is';
import {Maybe, result, task, type Task} from 'true-myth';

import {createAudioChunker, type AudioChunker, removeOverlap, type AudioChunk} from './audioChunker';
import type {SpeechEngine} from './speechEngine';
import {toSpeechError} from './toSpeechError';

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;
const STREAM_POLL_MS = 500;
const MAX_QUEUED_SECONDS = 120;
const MICROSECONDS_PER_MILLISECOND = 1000;

/** Capture boundary: the application adapts its calling repository here. */
export interface NoteTakerCall {
  getSelfParticipant(): {audioStream(): MediaStream | undefined; user: {name(): string}};
  getNoteTakerAudioParticipant(
    trackId: string,
  ): {clientId: string; user: {qualifiedId: {id: string; domain: string}; name(): string}} | undefined;
  getNoteTakerAudioStreams(): MediaStream[];
  isMicrophoneMuted(): boolean;
  subscribeMicrophoneMute(listener: () => void): {dispose(): void};
}

export interface NoteTakerSession {
  start(): Task<void, Error>;
  stop(): Promise<void>;
  cancel(): void;
}

export type Speaker = string;
export interface TranscriptEntry {
  seconds: number;
  text: string;
  speaker: Speaker;
  speakerName?: string;
}
export interface TranscriptionStats {
  inferenceMs: number;
  audioSeconds: number;
  queuedSeconds: number;
  provisional?: boolean;
}

export interface NoteTakerAudioPlatform {
  createContext(): AudioContext;
  createStream(tracks: MediaStreamTrack[]): MediaStream;
}

const browserAudioPlatform: NoteTakerAudioPlatform = {
  createContext: () => {
    return new AudioContext({sampleRate: SAMPLE_RATE});
  },
  createStream: tracks => {
    return new MediaStream(tracks);
  },
};

export interface NoteTakerSessionOptions {
  clock: Clock;
  call: NoteTakerCall;
  engine: SpeechEngine;
  onEntry: (entry: TranscriptEntry) => void;
  onError: (error: unknown) => void;
  onStats?: (stats: TranscriptionStats) => void;
  onPreview?: (entry: TranscriptEntry) => void;
  audioPlatform?: NoteTakerAudioPlatform;
  timestampOffsetSeconds?: number;
}

/** Separate local/remote taps. Never stops or modifies the call's tracks. */
export function createNoteTakerSession({
  clock,
  call,
  engine,
  onEntry,
  onError,
  onStats,
  onPreview,
  audioPlatform = browserAudioPlatform,
  timestampOffsetSeconds = 0,
}: NoteTakerSessionOptions): NoteTakerSession {
  let audioContext: Maybe<AudioContext> = Maybe.nothing();
  let timer: Maybe<ReturnType<Clock['setInterval']>> = Maybe.nothing();
  const sources = new Map<MediaStreamTrack, {source: MediaStreamAudioSourceNode; gain: GainNode; speaker: Speaker}>();
  const channels = new Map<Speaker, {processor: ScriptProcessorNode; chunker: AudioChunker}>();
  const previousText: Record<Speaker, string> = {};
  let queue: (AudioChunk & {speaker: Speaker; speakerName: string; trackId?: string})[] = [];
  const previews = new Map<Speaker, AudioChunk & {speaker: Speaker; speakerName: string; trackId?: string}>();
  const finalizing: Record<Speaker, number> = {};
  let processing: Maybe<Promise<void>> = Maybe.nothing();
  let stopped = false;
  let muteSubscription: Maybe<{dispose(): void}> = Maybe.nothing();
  let stopPromise: Maybe<Promise<void>> = Maybe.nothing();
  let cancelled = false;

  function start(): Task<void, Error> {
    return task.tryOrElse(toSpeechError, async () => {
      const context = audioPlatform.createContext();
      audioContext = Maybe.just(context);
      createChannel('You');
      syncSources();
      muteSubscription = Maybe.just(
        call.subscribeMicrophoneMute(() => {
          syncSources();
        }),
      );
      timer = Maybe.just(
        clock.setInterval(() => {
          const synced = result.tryOrElse(toSpeechError, syncSources);
          if (synced.isErr) {
            disconnect();
            onError(synced.error);
          }
        }, STREAM_POLL_MS),
      );
      await context.resume();
    });
  }

  function createChannel(speaker: Speaker, trackId?: string): void {
    if (audioContext.isNothing) {
      return;
    }
    const context = audioContext.value;
    const offsetSeconds = timestampOffsetSeconds + context.currentTime;
    let attribution = getSpeakerName(speaker, trackId);
    const chunker = createAudioChunker(chunk => {
      enqueue({...chunk, seconds: chunk.seconds + offsetSeconds, speaker, ...attribution});
    });
    // ScriptProcessor keeps the capture small; inference runs in the worker.
    const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
    processor.onaudioprocess = event => {
      if (!stopped) {
        const nextAttribution = getSpeakerName(speaker, trackId);
        if (
          nextAttribution.speakerName !== attribution.speakerName ||
          !attribution.identity.equals(nextAttribution.identity)
        ) {
          // Preserve the name at capture time; inference may finish after another person speaks.
          if (attribution.identity.isJust) {
            chunker.finish();
          }
          attribution = nextAttribution;
        }
        chunker.push(event.inputBuffer.getChannelData(0));
        if (!isUndefined(onPreview)) {
          const preview = chunker.preview();
          if (!isUndefined(preview)) {
            // Replace queued drafts instead of building a backlog of outdated hypotheses.
            previews.set(speaker, {...preview, seconds: preview.seconds + offsetSeconds, speaker, ...attribution});
            scheduleDrain();
          }
        }
      }
    };
    processor.connect(context.destination); // Output stays silent; no capture playback.
    channels.set(speaker, {processor, chunker});
  }

  function getSpeakerName(
    speaker: Speaker,
    trackId?: string,
  ): {speakerName: string; trackId?: string; identity: Maybe<string>} {
    if (speaker === 'You') {
      const name = call.getSelfParticipant().user.name();
      return {speakerName: name.length > 0 ? name : 'You', trackId, identity: Maybe.just('self')};
    }
    if (isUndefined(trackId)) {
      return {speakerName: 'Remote participant', identity: Maybe.nothing()};
    }
    const participant = Maybe.of(call.getNoteTakerAudioParticipant(trackId));
    const name = participant
      .map(value => {
        return value.user.name();
      })
      .unwrapOr('Remote participant');
    const identity = participant.map(value => {
      return JSON.stringify([value.user.qualifiedId.domain, value.user.qualifiedId.id, value.clientId]);
    });
    return {speakerName: name.length > 0 ? name : 'Remote participant', trackId, identity};
  }

  function syncSources(): void {
    if (audioContext.isNothing) {
      return;
    }
    const context = audioContext.value;
    const localTracks = new Set(call.getSelfParticipant().audioStream()?.getAudioTracks() ?? []);
    const tracks = new Set(
      call.getNoteTakerAudioStreams().flatMap(stream => {
        return stream.getAudioTracks();
      }),
    );
    for (const [track, nodes] of sources) {
      if (!tracks.has(track) || track.readyState === 'ended') {
        nodes.source.disconnect();
        nodes.gain.disconnect();
        sources.delete(track);
        if (nodes.speaker !== 'You') {
          const channel = channels.get(nodes.speaker);
          channel?.chunker.finish();
          if (!isUndefined(channel)) {
            channel.processor.onaudioprocess = null;
            channel.processor.disconnect();
            channels.delete(nodes.speaker);
          }
        }
      }
    }
    for (const track of tracks) {
      if (track.readyState === 'ended') {
        continue;
      }
      const speaker = localTracks.has(track) ? 'You' : `remote:${track.id}`;
      let nodes = sources.get(track);
      if (isUndefined(nodes)) {
        if (!channels.has(speaker)) {
          createChannel(speaker, track.id);
        }
        const processor = channels.get(speaker)?.processor;
        if (isUndefined(processor)) {
          continue;
        }
        const source = context.createMediaStreamSource(audioPlatform.createStream([track]));
        const gain = context.createGain();
        source.connect(gain);
        gain.connect(processor);
        nodes = {source, gain, speaker};
        sources.set(track, nodes);
      }
      // AVS can mute transmission without disabling its microphone track.
      nodes.gain.gain.value = speaker === 'You' && call.isMicrophoneMuted() ? 0 : 1;
    }
  }

  function queuedSeconds(): number {
    return queue.reduce((total, chunk) => {
      return total + chunk.audio.length / SAMPLE_RATE;
    }, 0);
  }

  function enqueue(chunk: AudioChunk & {speaker: Speaker; speakerName: string; trackId?: string}): void {
    if (cancelled) {
      return;
    }
    if (queuedSeconds() >= MAX_QUEUED_SECONDS) {
      disconnect();
      onError(
        new Error('Transcription cannot keep up. Capture stopped; queued audio is finishing. Try a smaller model.'),
      );
      return;
    }
    finalizing[chunk.speaker] = chunk.seconds;
    const preview = previews.get(chunk.speaker);
    if (!isUndefined(preview) && preview.seconds <= chunk.seconds) {
      previews.delete(chunk.speaker);
    }
    queue.push(chunk);
    scheduleDrain();
  }

  function scheduleDrain(): void {
    if (processing.isNothing) {
      processing = Maybe.just(drain());
    }
  }

  async function drain(): Promise<void> {
    const drained = await task.tryOrElse(toSpeechError, async () => {
      while ((queue.length > 0 || previews.size > 0) && !cancelled) {
        // Final chunks take priority; there is only one queued preview per speaker.
        let item = queue.shift();
        const provisional = isUndefined(item);
        if (isUndefined(item)) {
          item = previews.values().next().value;
          if (isUndefined(item)) {
            break;
          }
          previews.delete(item.speaker);
        }
        const started = clock.currentMonotonicMicroseconds;
        // Worker engines transfer this buffer, so retain its duration before it detaches.
        const audioSeconds = item.audio.length / SAMPLE_RATE;
        const transcription = await engine.transcribe(item.audio);
        if (transcription.isErr) {
          if (!cancelled) {
            disconnect();
            queue = [];
            onError(transcription.error);
          }
          return;
        }
        const rawText = transcription.value.trim();
        const text = item.overlap ? removeOverlap(previousText[item.speaker] ?? '', rawText) : rawText;
        const entry = {
          seconds: item.seconds,
          text,
          speaker: item.speaker,
          speakerName: item.speakerName,
        };
        if (!cancelled) {
          if (provisional) {
            // An in-flight preview cannot overwrite a chunk that has already been finalized.
            if (!stopped && item.seconds > (finalizing[item.speaker] ?? -Infinity)) {
              onPreview?.(entry);
            }
          } else {
            previousText[item.speaker] = rawText;
            if (text.length > 0) {
              onEntry(entry);
            }
            onPreview?.({seconds: item.seconds, text: '', speaker: item.speaker});
          }
        }
        if (!cancelled) {
          onStats?.({
            inferenceMs: Number(clock.currentMonotonicMicroseconds - started) / MICROSECONDS_PER_MILLISECOND,
            audioSeconds,
            queuedSeconds: queuedSeconds(),
            ...(provisional ? {provisional: true} : {}),
          });
        }
      }
    });
    processing = Maybe.nothing();
    if (drained.isErr && !cancelled) {
      disconnect();
      queue = [];
      onError(drained.error);
    }
  }

  function disconnect(): void {
    stopped = true;
    previews.clear();
    if (timer.isJust) {
      clock.clearInterval(timer.value);
      timer = Maybe.nothing();
    }
    if (muteSubscription.isJust) {
      muteSubscription.value.dispose();
      muteSubscription = Maybe.nothing();
    }
    for (const {processor} of channels.values()) {
      processor.onaudioprocess = null;
      processor.disconnect();
    }
    for (const {source, gain} of sources.values()) {
      source.disconnect();
      gain.disconnect();
    }
    sources.clear();
    if (audioContext.isJust) {
      const closingContext = audioContext.value;
      void task.tryOrElse(toSpeechError, () => {
        return closingContext.close();
      });
    }
    audioContext = Maybe.nothing();
  }

  function stop(): Promise<void> {
    if (stopPromise.isJust) {
      return stopPromise.value;
    }
    disconnect();
    const stopping = Promise.resolve().then(async (): Promise<void> => {
      for (const {chunker} of channels.values()) {
        chunker.finish();
      }
      channels.clear();
      if (processing.isJust) {
        await processing.value;
      }
      engine.dispose();
    });
    stopPromise = Maybe.just(stopping);
    return stopping;
  }

  function cancel(): void {
    cancelled = true;
    disconnect();
    channels.clear();
    queue = [];
    engine.dispose();
  }
  return {start, stop, cancel};
}
