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
 * Frame source adapter for MediaStreamTrack input.
 *
 * This class provides a unified interface for extracting frames from a
 * MediaStreamTrack. It prefers WebCodecs MediaStreamTrackProcessor with
 * backpressure (single frame in flight) and falls back to HTMLVideoElement
 * callbacks when unavailable.
 */

import {getLogger, Logger} from 'Util/Logger';

import {VideoSource} from './VideoSource';

export type FrameCallback = (
  frame: ImageBitmap,
  timestampSeconds: number,
  width: number,
  height: number,
) => Promise<void> | void;

export class FrameSource {
  private readonly logger: Logger;
  private processor: any | null = null;
  private processorAbort: AbortController | null = null;
  private processorReader: ReadableStreamDefaultReader<any> | null = null;
  private processorPipe: Promise<void> | null = null;
  private videoSource: VideoSource | null = null;
  private processing = false;
  private running = false;

  constructor(private readonly track: MediaStreamTrack) {
    this.logger = getLogger('FrameSource');
  }

  public async start(onFrame: FrameCallback, onDrop?: () => void): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    const Processor = (window as any)?.MediaStreamTrackProcessor;
    if (Processor) {
      await this.startWithProcessor(Processor, onFrame);
      return;
    }

    await this.startWithVideoElement(onFrame, onDrop);
  }

  public stop(): void {
    this.running = false;
    if (this.processorAbort) {
      this.processorAbort.abort();
      this.processorAbort = null;
    }
    if (this.processorReader) {
      try {
        this.processorReader.cancel();
      } catch (error) {
        this.logger.warn('FrameSource cancel failed', error);
      }
      this.processorReader = null;
    }
    this.processor = null;
    this.processorPipe = null;
    this.videoSource?.stop();
    this.videoSource = null;
    this.processing = false;
  }

  private async startWithProcessor(
    Processor: new (opts: {track: MediaStreamTrack}) => {readable: ReadableStream<any>},
    onFrame: FrameCallback,
  ): Promise<void> {
    try {
      this.processor = new Processor({track: this.track});
    } catch (error) {
      this.logger.warn('FrameSource processor init failed, falling back to video element', error);
      await this.startWithVideoElement(onFrame);
      return;
    }

    const readable = this.processor.readable;
    const abortController = new AbortController();
    this.processorAbort = abortController;
    const reader = readable.getReader();
    this.processorReader = reader;

    this.processorPipe = (async () => {
      try {
        while (this.running && !abortController.signal.aborted) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          const frame = result.value;
          let bitmap: ImageBitmap | null = null;
          try {
            if (!this.running) {
              frame.close();
              continue;
            }
            bitmap = await createImageBitmap(frame);
            const timestampSeconds = Number.isFinite(frame.timestamp)
              ? frame.timestamp / 1_000_000
              : performance.now() / 1000;
            const width = bitmap.width;
            const height = bitmap.height;
            await onFrame(bitmap, timestampSeconds, width, height);
          } catch (error) {
            if (bitmap) {
              try {
                bitmap.close();
              } catch {
                // Ignore bitmap close errors.
              }
            }
            this.logger.warn('FrameSource processor frame failed', error);
          } finally {
            frame.close();
          }
        }
      } catch (error) {
        if (abortController.signal.aborted || error?.name === 'AbortError') {
          return;
        }
        this.logger.warn('FrameSource processor pipe failed', error);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // Ignore release errors.
        }
        if (this.processorReader === reader) {
          this.processorReader = null;
        }
      }
    })();
  }

  private async startWithVideoElement(onFrame: FrameCallback, onDrop?: () => void): Promise<void> {
    this.videoSource = new VideoSource(this.track);
    await this.videoSource.start(async (timestamp, width, height) => {
      if (!this.running) {
        return;
      }
      if (!this.videoSource) {
        return;
      }
      if (this.processing) {
        onDrop?.();
        return;
      }
      this.processing = true;
      let bitmap: ImageBitmap | null = null;
      try {
        bitmap = await createImageBitmap(this.videoSource.element);
        await onFrame(bitmap, timestamp, bitmap.width, bitmap.height);
      } catch (error) {
        if (bitmap) {
          try {
            bitmap.close();
          } catch {
            // Ignore bitmap close errors.
          }
        }
        this.logger.warn('FrameSource video element frame failed', error);
      } finally {
        this.processing = false;
      }
    });
  }
}
