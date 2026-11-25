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

const SAMPLE_RATE = 16000;
const FRAME_SAMPLES = 320;
const MIN_SPEECH_SECONDS = 3;
const TARGET_SECONDS = 6;
const MAX_SECONDS = 10;
const OVERLAP_SECONDS = 2;
const PAUSE_SECONDS = 0.6;
const PREVIEW_SECONDS = 1;
const SPEECH_ENERGY = 0.00001;

export interface AudioChunk {
  audio: Float32Array<ArrayBuffer>;
  seconds: number;
  overlap: boolean;
}

export interface AudioChunker {
  push(samples: Float32Array): void;
  preview(): AudioChunk | undefined;
  finish(): void;
}

/** Pause-aware segmentation; forced cuts retain context for the next chunk. */
export function createAudioChunker(onChunk: (chunk: AudioChunk) => void): AudioChunker {
  let buffer: number[] = [];
  let captured = 0;
  let start = 0;
  let lastSpeech = 0;
  let speechSamples = 0;
  let overlapsPrevious = false;
  let lastPreview = 0;

  function push(samples: Float32Array): void {
    for (let offset = 0; offset < samples.length; offset += FRAME_SAMPLES) {
      const frame = samples.subarray(offset, offset + FRAME_SAMPLES);
      const energy =
        frame.reduce((sum, sample) => {
          return sum + sample * sample;
        }, 0) / frame.length;
      buffer.push(...frame);
      captured += frame.length;
      if (energy >= SPEECH_ENERGY) {
        lastSpeech = captured;
        speechSamples += frame.length;
      }
      const duration = buffer.length / SAMPLE_RATE;
      const paused = speechSamples > 0 && (captured - lastSpeech) / SAMPLE_RATE >= PAUSE_SECONDS;
      // End a short utterance after a pause; continuous speech gets a longer window.
      if (paused && (speechSamples / SAMPLE_RATE >= MIN_SPEECH_SECONDS || duration >= TARGET_SECONDS)) {
        flush(false);
      } else if (duration >= MAX_SECONDS) {
        flush(speechSamples > 0);
      }
    }
  }

  /** Latest hypothesis window, at most once per second. Never consumes the final-quality buffer. */
  function preview(): AudioChunk | undefined {
    const recentlySpeaking = (captured - lastSpeech) / SAMPLE_RATE < PAUSE_SECONDS;
    if (
      speechSamples < SAMPLE_RATE * PREVIEW_SECONDS ||
      !recentlySpeaking ||
      captured - lastPreview < SAMPLE_RATE * PREVIEW_SECONDS
    ) {
      return undefined;
    }
    lastPreview = captured;
    return {audio: Float32Array.from(buffer), seconds: start / SAMPLE_RATE, overlap: overlapsPrevious};
  }

  function finish(): void {
    flush(false);
  }

  function flush(overlap: boolean): void {
    const retained = overlap ? OVERLAP_SECONDS * SAMPLE_RATE : 0;
    if (speechSamples > 0 && lastSpeech > start + (overlapsPrevious ? OVERLAP_SECONDS * SAMPLE_RATE : 0)) {
      onChunk({
        audio: Float32Array.from(buffer),
        seconds: start / SAMPLE_RATE,
        overlap: overlapsPrevious,
      });
    }
    buffer = retained > 0 ? buffer.slice(-retained) : [];
    start = captured - buffer.length;
    overlapsPrevious = overlap;
    speechSamples = 0;
  }
  return {push, preview, finish};
}

/** Only splice repeated words at an overlapping cut, preserving intentional repeats elsewhere. */
export function removeOverlap(previous: string, next: string): string {
  const oldWords = previous.trim().split(/\s+/);
  const newWords = next.trim().split(/\s+/);
  const normalize = (word: string): string => {
    return word.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  };
  const MAX_SEAM_WORDS = 24;
  const MIN_SEAM_WORDS = 2;
  for (let count = Math.min(oldWords.length, newWords.length, MAX_SEAM_WORDS); count >= MIN_SEAM_WORDS; count--) {
    if (oldWords.slice(-count).map(normalize).join(' ') === newWords.slice(0, count).map(normalize).join(' ')) {
      return newWords.slice(count).join(' ');
    }
  }
  return next;
}
