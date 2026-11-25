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

import {createAudioChunker, removeOverlap} from './audioChunker';

describe('meeting audio chunks', () => {
  it('emits an utterance at a pause without waiting for a fixed eight-second window', () => {
    const onChunk = jest.fn();
    const chunker = createAudioChunker(onChunk);
    chunker.push(new Float32Array(16000 * 4).fill(0.1));
    expect(onChunk).not.toHaveBeenCalled();
    chunker.push(new Float32Array(16000));
    expect(onChunk).toHaveBeenCalledTimes(1);
    const chunk = onChunk.mock.calls[0][0];
    expect(chunk.seconds).toBe(0);
    expect(chunk.audio.length / 16000).toBeCloseTo(4.6);
    expect(chunk.overlap).toBe(false);
  });

  it('offers a one-second preview without consuming the final-quality context', () => {
    const onChunk = jest.fn();
    const chunker = createAudioChunker(onChunk);
    chunker.push(new Float32Array(16000).fill(0.1));
    expect(chunker.preview()?.audio.length).toBe(16000);
    expect(chunker.preview()).toBeUndefined();
    chunker.push(new Float32Array(8000).fill(0.1));
    expect(chunker.preview()).toBeUndefined();
    chunker.push(new Float32Array(8000).fill(0.1));
    expect(chunker.preview()?.audio.length).toBe(32000);
    expect(onChunk).not.toHaveBeenCalled();
    chunker.finish();
    expect(onChunk.mock.calls[0][0].audio.length).toBe(32000);
  });

  it('overlaps forced cuts by two seconds and flushes the final new speech', () => {
    const onChunk = jest.fn();
    const chunker = createAudioChunker(onChunk);
    chunker.push(new Float32Array(16000 * 12).fill(0.1));
    chunker.finish();
    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk.mock.calls[0][0]).toMatchObject({seconds: 0, overlap: false});
    expect(onChunk.mock.calls[1][0]).toMatchObject({seconds: 8, overlap: true});
    expect(onChunk.mock.calls[1][0].audio.length).toBe(16000 * 4);
  });

  it('does not transcribe silence or repeat a retained tail when stopped', () => {
    const onChunk = jest.fn();
    const chunker = createAudioChunker(onChunk);
    chunker.push(new Float32Array(16000 * 10));
    expect(onChunk).not.toHaveBeenCalled();
    chunker.push(new Float32Array(16000 * 10).fill(0.1));
    chunker.finish();
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk.mock.calls[0][0].seconds).toBe(10);
  });

  it('removes repeated overlap words despite punctuation and casing', () => {
    expect(removeOverlap('Please send the final report.', 'The final report should arrive tomorrow.')).toBe(
      'should arrive tomorrow.',
    );
    expect(removeOverlap('yes', 'yes, I agree')).toBe('yes, I agree');
  });
});
