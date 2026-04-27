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

export class Graph {
  data: number[];
  width: number;
  height: number;
  maxPoints: number;
  div: HTMLDivElement | null;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;

  constructor() {
    this.data = Array.from({length: 50}, () => 0);
    this.width = 50;
    this.height = 50;
    this.maxPoints = this.width;

    document.querySelectorAll('div.video-performance-canvas').forEach(e => e.remove());

    this.div = document.createElement('div');
    this.div.classList.add('video-performance-canvas');
    this.div.style.cssText = `position:fixed;top:0;right:0;width:${this.width * 2}px;height:${this.height}px;z-index:99999;background-color:black;`;
    document.body.appendChild(this.div);

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width * 4;
    this.canvas.height = this.height * 2;
    this.canvas.style.cssText = `width:100%;height:100%;`;
    this.div.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.font = '20px Sans';
    }
    this.draw();
  }

  remove() {
    this.data = [];
    this.div?.remove();
    this.div = null;
    this.canvas = null;
    this.ctx = null;
  }

  draw() {
    if (!this.ctx || !this.canvas) {
      return;
    }
    const ctx = this.ctx;
    const {width, height} = this.canvas;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = 'darkblue';
    const w = width / this.data.length;
    const max = Math.max(...this.data);
    this.data.forEach((value, i) => {
      const h = (height * value) / max;
      ctx.fillRect(i * w, height - h, w, h);
    });
    if (this.data.length) {
      ctx.fillStyle = 'white';
      ctx.fillText(`${this.data[this.data.length - 1].toPrecision(2)} fps`, 2, 20);
    }
  }

  push(value: number, info: string) {
    if (!this.div) {
      return;
    }
    this.data.push(value);
    if (this.data.length > this.maxPoints) {
      this.data.splice(0, this.data.length - this.maxPoints);
    }
    this.draw();
    this.div.title = info;
  }
}
