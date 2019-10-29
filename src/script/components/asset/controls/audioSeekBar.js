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

import {debounce} from 'underscore';

import {interpolate} from 'Util/ArrayUtil';
import {clamp} from 'Util/NumberUtil';

class AudioSeekBarComponent {
  /**
   * Construct a audio seek bar that renders audio levels.
   *
   * @param {Object} params - Component parameters
   * @param {HTMLElement} params.media_src - Media source
   * @param {File} params.asset - Asset file
   * @param {boolean} params.disabled - Disabled seek bar
   * @param {Object} componentInfo - Component information
   */
  constructor(params, componentInfo) {
    this.dispose = this.dispose.bind(this);
    this.audioElement = params.src;

    this.element = componentInfo.element;
    this.loudness = [];
    this.levels = [];

    this.disabled = ko.computed(
      () => {
        if (typeof params.disabled === 'function') {
          this.element.classList.toggle('element-disabled', params.disabled());
        }
      },
      {disposeWhenNodeIsRemoved: componentInfo.element},
    );

    const assetMeta = params.asset.meta;
    if (assetMeta !== null && assetMeta.loudness !== null) {
      this.loudness = this._normalizeLoudness(assetMeta.loudness, this.element.clientHeight);
    }

    this._onResizeFired = debounce(() => {
      this._renderLevels();
      this._onTimeUpdate();
    }, 500);

    this._renderLevels();

    this._onLevelClick = this._onLevelClick.bind(this);
    this._onTimeUpdate = this._onTimeUpdate.bind(this);
    this._onAudioEnded = this._onAudioEnded.bind(this);
    this.audioElement.addEventListener('ended', this._onAudioEnded);
    this.audioElement.addEventListener('timeupdate', this._onTimeUpdate);
    this.element.addEventListener('click', this._onLevelClick);
    window.addEventListener('resize', this._onResizeFired);
  }

  _renderLevels() {
    const numberOfLevelsFitOnScreen = Math.floor(this.element.clientWidth / 3); // 2px + 1px
    const scaledLoudness = interpolate(this.loudness, numberOfLevelsFitOnScreen);
    this.element.innerHTML = '';

    this.levels = scaledLoudness.map(loudness => {
      const level = document.createElement('span');
      level.style.height = `${loudness}px`;
      this.element.appendChild(level);
      return level;
    });
  }

  _normalizeLoudness(loudness, max) {
    const peak = Math.max(...loudness);
    const scale = max / peak;
    return peak > max ? loudness.map(level => level * scale) : loudness;
  }

  _onLevelClick(event) {
    const mouse_x = event.pageX - event.currentTarget.getBoundingClientRect().left;
    const calculatedTime = (this.audioElement.duration * mouse_x) / event.currentTarget.clientWidth;
    const currentTime = isNaN(calculatedTime) ? 0 : calculatedTime;

    this.audioElement.currentTime = clamp(currentTime, 0, this.audioElement.duration);
    this._onTimeUpdate();
  }

  _onTimeUpdate() {
    const index = Math.floor((this.audioElement.currentTime / this.audioElement.duration) * this.levels.length);
    this.levels.forEach((level, levelIndex) => level.classList.toggle('active', levelIndex <= index));
  }

  _onAudioEnded() {
    this.levels.forEach(level => level.classList.remove('active'));
  }

  dispose() {
    this.disabled.dispose();
    this.audioElement.removeEventListener('ended', this._onAudioEnded);
    this.audioElement.removeEventListener('timeupdate', this._onTimeUpdate);
    this.element.removeEventListener('click', this._onLevelClick);
    window.removeEventListener('resize', this._onResizeFired);
  }
}

ko.components.register('audio-seek-bar', {
  template: '<!-- content is generated -->',
  viewModel: {
    createViewModel(params, componentInfo) {
      return new AudioSeekBarComponent(params, componentInfo);
    },
  },
});
