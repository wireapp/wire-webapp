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

import {clamp} from 'Util/NumberUtil';

interface Params {
  dark: boolean;
  disabled: ko.Subscribable<boolean>;
  /** Media source */
  src: HTMLMediaElement;
}

class SeekBarComponent {
  mediaElement: HTMLMediaElement;
  darkMode: boolean;
  disabled: ko.PureComputed<void>;
  seekBar: HTMLInputElement;
  isSeekBarMouseOver: ko.Observable<boolean>;
  isSeekBarThumbDragged: ko.Observable<boolean>;
  showSeekBarThumb: ko.PureComputed<any>;

  constructor(params: Params, element: HTMLElement) {
    this.mediaElement = params.src;
    this.darkMode = params.dark;
    this.disabled = ko.pureComputed(() => {
      if (typeof params.disabled === 'function') {
        params.disabled();
      }
    });

    this.seekBar = element.querySelector('input');
    this.isSeekBarMouseOver = ko.observable(false);
    this.isSeekBarThumbDragged = ko.observable(false);
    this.showSeekBarThumb = ko.pureComputed(() => this.isSeekBarThumbDragged() || this.isSeekBarMouseOver());

    this.seekBar.addEventListener('mousedown', this.on_mouse_down);
    this.seekBar.addEventListener('mouseup', this.on_mouse_up);
    this.seekBar.addEventListener('mouseenter', this.on_mouse_enter);
    this.seekBar.addEventListener('mouseleave', this.on_mouse_leave);
    this.seekBar.addEventListener('change', this.on_change);
    this.mediaElement.addEventListener('timeupdate', this.on_timeupdate);
    this.mediaElement.addEventListener('ended', this.on_ended);
    this.updateSeekBarStyle(0);
  }

  on_mouse_down = (): void => {
    this.mediaElement.pause();
    this.isSeekBarThumbDragged(true);
  };

  on_mouse_up = (): void => {
    this.mediaElement.play();
    this.isSeekBarThumbDragged(false);
  };

  on_mouse_enter = (): void => {
    this.isSeekBarMouseOver(true);
  };

  on_mouse_leave = (): void => {
    this.isSeekBarMouseOver(false);
  };

  on_change = (): void => {
    const currentTime = this.mediaElement.duration * (parseInt(this.seekBar.value, 10) / 100);
    this.mediaElement.currentTime = clamp(currentTime, 0, this.mediaElement.duration);
  };

  on_timeupdate = (): void => {
    const value = (100 / this.mediaElement.duration) * this.mediaElement.currentTime;
    this.updateSeekBar(value);
  };

  on_ended = (): void => {
    this.updateSeekBar(100);
  };

  private updateSeekBar(progress: number): void {
    if (this.mediaElement.paused && progress < 100) {
      return;
    }

    this.seekBar.value = progress.toString(10);
    this.updateSeekBarStyle(progress);
  }

  private updateSeekBarStyle(progress: number): void {
    this.seekBar.style.setProperty('--seek-bar-progress', `${progress}%`);
  }

  dispose = (): void => {
    this.seekBar.removeEventListener('mousedown', this.on_mouse_down);
    this.seekBar.removeEventListener('mouseup', this.on_mouse_up);
    this.seekBar.removeEventListener('mouseenter', this.on_mouse_enter);
    this.seekBar.removeEventListener('mouseleave', this.on_mouse_leave);
    this.seekBar.removeEventListener('change', this.on_change);
    this.mediaElement.removeEventListener('timeupdate', this.on_timeupdate);
    this.mediaElement.removeEventListener('ended', this.on_ended);
  };
}

ko.components.register('seek-bar', {
  template: `
    <input type="range" value="0" max="100" data-bind="css: {'show-seek-bar-thumb': showSeekBarThumb, 'element-disabled': disabled, 'seek-bar--dark': darkMode}">
  `,
  viewModel: {
    createViewModel(params: Params, {element}: ko.components.ComponentInfo): SeekBarComponent {
      return new SeekBarComponent(params, element as HTMLElement);
    },
  },
});
