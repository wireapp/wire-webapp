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

import type {Pipeline, PipelineConfig, PipelineInit} from './Pipeline';

export class PassthroughPipeline implements Pipeline {
  public readonly type = 'passthrough' as const;
  private outputCanvas: HTMLCanvasElement | null = null;

  public async init(init: PipelineInit): Promise<void> {
    this.outputCanvas = init.outputCanvas;
  }

  public updateConfig(_config: PipelineConfig): void {
    // No-op.
  }

  public async processFrame(frame: ImageBitmap, _timestamp: number, width: number, height: number): Promise<void> {
    if (!this.outputCanvas) {
      frame.close();
      return;
    }
    const ctx = this.outputCanvas.getContext('2d');
    if (!ctx) {
      frame.close();
      return;
    }
    ctx.drawImage(frame, 0, 0, width, height);
    frame.close();
  }

  public setBackgroundImage(bitmap: ImageBitmap, _width: number, _height: number): void {
    bitmap.close();
  }

  public setBackgroundVideoFrame(bitmap: ImageBitmap, _width: number, _height: number): void {
    bitmap.close();
  }

  public clearBackground(): void {
    // No-op.
  }

  public notifyDroppedFrames(_count: number): void {
    // No-op.
  }

  public isOutputCanvasTransferred(): boolean {
    return false;
  }

  public stop(): void {
    this.outputCanvas = null;
  }
}
