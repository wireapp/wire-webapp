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

export type RmsGraphHandle = {
  element: HTMLElement;
  destroy: () => void;
};

export function createRmsGraphPanel(): HTMLElement {
  const panel = document.createElement('div');

  panel.style.position = 'fixed';
  panel.style.top = '16px';
  panel.style.right = '16px';
  panel.style.zIndex = '999999';
  panel.style.display = 'flex';
  panel.style.flexDirection = 'column';
  panel.style.gap = '8px';
  panel.style.padding = '8px';
  panel.style.background = 'rgba(0, 0, 0, 0.85)';
  panel.style.border = '2px solid red';
  panel.style.borderRadius = '8px';

  document.body.appendChild(panel);

  return panel;
}

export function addRmsGraph(
  panel: HTMLElement,
  analyser: AnalyserNode,
  gain: GainNode,
  track: MediaStreamTrack,
  index: number,
): RmsGraphHandle {
  const width = 340;
  const height = 70;

  const row = document.createElement('div');
  row.style.width = `${width}px`;
  row.style.background = '#111';
  row.style.border = '1px solid #333';
  row.style.borderRadius = '6px';
  row.style.overflow = 'hidden';

  const label = document.createElement('div');
  label.style.color = 'white';
  label.style.font = '12px monospace';
  label.style.padding = '4px 6px';
  label.textContent = `Track ${index + 1} | ${track.id.slice(0, 10)}`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '4';
  slider.step = '0.1';
  slider.value = String(gain.gain.value);
  slider.style.width = '100%';

  const volumeText = document.createElement('div');
  volumeText.style.color = 'white';
  volumeText.style.font = '12px monospace';
  volumeText.style.padding = '2px 6px';
  volumeText.textContent = `Gain: ${gain.gain.value.toFixed(1)}x`;

  slider.addEventListener('input', () => {
    const value = Number(slider.value);

    gain.gain.setValueAtTime(value, gain.context.currentTime);
    volumeText.textContent = `Gain: ${value.toFixed(1)}x`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = 'block';

  row.appendChild(label);
  row.appendChild(slider);
  row.appendChild(volumeText);
  row.appendChild(canvas);
  panel.appendChild(row);

  const ctx = canvas.getContext('2d')!;
  const samples = new Float32Array(analyser.fftSize);
  const values: number[] = [];

  const timer = window.setInterval(() => {
    analyser.getFloatTimeDomainData(samples);

    let sum = 0;
    for (const sample of samples) {
      sum += sample * sample;
    }

    const rms = Math.sqrt(sum / samples.length);

    values.push(rms);
    if (values.length > width) {
      values.shift();
    }

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'lime';
    ctx.lineWidth = 2;
    ctx.beginPath();

    values.forEach((value, i) => {
      const normalized = Math.min(value / 0.2, 1);
      const x = i;
      const y = height - normalized * height;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = '12px monospace';
    ctx.fillText(`RMS: ${rms.toFixed(5)}`, 8, 18);
  }, 100);

  return {
    element: row,
    destroy: () => {
      window.clearInterval(timer);
      row.remove();
    },
  };
}
