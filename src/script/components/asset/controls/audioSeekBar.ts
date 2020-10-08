/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';
import {debounce} from 'underscore';

import {interpolate} from 'Util/ArrayUtil';
import {clamp} from 'Util/NumberUtil';

import {FileAsset} from '../../../entity/message/FileAsset';

/**
 * A float that must be between 0 and 1
 */
type Fraction = number;

interface Params {
  asset: FileAsset;
  disabled: ko.Subscribable<boolean>;
  src: HTMLAudioElement;
}

class AudioSeekBarComponent {
  audioElement: HTMLAudioElement;
  loudness: Fraction[];
  private readonly onResizeFired: () => void;

  constructor({asset, disabled, src}: Params, private readonly element: HTMLElement) {
    this.audioElement = src;
    this.loudness = [];

    ko.computed(
      () => {
        if (typeof disabled === 'function') {
          this.element.classList.toggle('element-disabled', disabled());
        }
      },
      {disposeWhenNodeIsRemoved: element},
    );

    if (asset.meta?.loudness !== null) {
      this.loudness = Array.from(asset.meta.loudness).map(level => level / 256);
    }

    this.onResizeFired = debounce(() => {
      this.renderLevels();
      this.onTimeUpdate();
    }, 500);

    this.renderLevels();

    this.audioElement.addEventListener('ended', this.onAudioEnded);
    this.audioElement.addEventListener('timeupdate', this.onTimeUpdate);
    this.element.addEventListener('click', this.onLevelClick);
    window.addEventListener('resize', this.onResizeFired);
  }

  private renderLevels(): void {
    const path = this.getLevelsPath();
    const svg = `
    <svg width="100%" height="100%" viewbox="0 0 1 1" preserveAspectRatio="none">
      <path d="${path}"/>
      <path class="active" d="${path}"/>
    </svg>`;
    this.element.innerHTML = svg;
  }

  private updateSeekClip(position: Fraction) {
    const percent = position * 100;
    this.element.style.setProperty('--seek-bar-clip', `polygon(0 0, ${percent}% 0, ${percent}% 100%, 0 100%)`);
  }

  private getLevelsPath(): string {
    const numberOfLevelsFitOnScreen = Math.floor(this.element.clientWidth / 3);
    const singleWidth = 1 / numberOfLevelsFitOnScreen;
    const barWidth = (singleWidth / 3) * 2;
    const scaledLoudness = interpolate(this.loudness, numberOfLevelsFitOnScreen);
    return scaledLoudness
      .map((loudness, index) => {
        const x = index * singleWidth;
        const y = 0.5 - loudness / 2;
        return `M${x},${y}h${barWidth}V${1 - y}H${x}z`;
      })
      .join('');
  }

  private readonly onLevelClick = (event: MouseEvent): void => {
    const currentTarget = event.currentTarget as Element;
    const mouse_x = event.pageX - currentTarget.getBoundingClientRect().left;
    const calculatedTime = (this.audioElement.duration * mouse_x) / currentTarget.clientWidth;
    const currentTime = isNaN(calculatedTime) ? 0 : calculatedTime;

    this.audioElement.currentTime = clamp(currentTime, 0, this.audioElement.duration);
    this.onTimeUpdate();
  };

  private readonly onTimeUpdate = (): void => {
    if (this.audioElement.duration) {
      this.updateSeekClip(this.audioElement.currentTime / this.audioElement.duration);
    }
  };

  private readonly onAudioEnded = (): void => this.updateSeekClip(0);

  dispose = (): void => {
    this.audioElement.removeEventListener('ended', this.onAudioEnded);
    this.audioElement.removeEventListener('timeupdate', this.onTimeUpdate);
    this.element.removeEventListener('click', this.onLevelClick);
    window.removeEventListener('resize', this.onResizeFired);
  };
}

ko.components.register('audio-seek-bar', {
  template: '<!-- content is generated -->',
  viewModel: {
    createViewModel(params: Params, {element}: ko.components.ComponentInfo): AudioSeekBarComponent {
      return new AudioSeekBarComponent(params, element as HTMLElement);
    },
  },
});
