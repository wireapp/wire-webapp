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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.SeekBarComponent = class SeekBarComponent {
  /**
   * Construct a seek bar.
   *
   * @param {Object} params - Component parameters
   * @param {HTMLElement} params.media_src - Media source
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.media_element = params.src;
    this.dark_mode = params.dark;
    this.disabled = ko.pureComputed(() => {
      if (typeof params.disabled === 'function') {
        params.disabled();
      }
    });

    this.seek_bar = $(component_info.element).find('input')[0];
    this.seek_bar_mouse_over = ko.observable(false);
    this.seek_bar_thumb_dragged = ko.observable(false);
    this.show_seek_bar_thumb = ko.pureComputed(() => this.seek_bar_thumb_dragged() || this.seek_bar_mouse_over());

    this.on_mouse_down = this.on_mouse_down.bind(this);
    this.on_mouse_up = this.on_mouse_up.bind(this);
    this.on_mouse_enter = this.on_mouse_enter.bind(this);
    this.on_mouse_leave = this.on_mouse_leave.bind(this);
    this.on_change = this.on_change.bind(this);
    this.on_timeupdate = this.on_timeupdate.bind(this);
    this.on_ended = this.on_ended.bind(this);
    this.seek_bar.addEventListener('mousedown', this.on_mouse_down);
    this.seek_bar.addEventListener('mouseup', this.on_mouse_up);
    this.seek_bar.addEventListener('mouseenter', this.on_mouse_enter);
    this.seek_bar.addEventListener('mouseleave', this.on_mouse_leave);
    this.seek_bar.addEventListener('change', this.on_change);
    this.media_element.addEventListener('timeupdate', this.on_timeupdate);
    this.media_element.addEventListener('ended', this.on_ended);
    this._update_seek_bar_style(0);
  }

  on_mouse_down() {
    this.media_element.pause();
    this.seek_bar_thumb_dragged(true);
  }

  on_mouse_up() {
    this.media_element.play();
    this.seek_bar_thumb_dragged(false);
  }

  on_mouse_enter() {
    this.seek_bar_mouse_over(true);
  }

  on_mouse_leave() {
    this.seek_bar_mouse_over(false);
  }

  on_change() {
    const currentTime = this.media_element.duration * (this.seek_bar.value / 100);
    this.media_element.currentTime = z.util.NumberUtil.clamp(currentTime, 0, this.media_element.duration);
  }

  on_timeupdate() {
    const value = (100 / this.media_element.duration) * this.media_element.currentTime;
    this._update_seek_bar(value);
  }

  on_ended() {
    this._update_seek_bar(100);
  }

  _update_seek_bar(progress) {
    if (this.media_element.paused && progress < 100) {
      return;
    }

    this.seek_bar.value = progress;
    this._update_seek_bar_style(progress);
  }

  _update_seek_bar_style(progress) {
    // TODO check if we can find a css solution
    const color = this.dark_mode ? 'rgba(141,152,159,0.24)' : 'rgba(255,255,255,0.4)';
    this.seek_bar.style.backgroundImage = `linear-gradient(to right, currentColor ${progress}%, ${color} ${progress}%)`;
  }

  dispose() {
    this.seek_bar.removeEventListener('mousedown', this.on_mouse_down);
    this.seek_bar.removeEventListener('mouseup', this.on_mouse_up);
    this.seek_bar.removeEventListener('mouseenter', this.on_mouse_enter);
    this.seek_bar.removeEventListener('mouseleave', this.on_mouse_leave);
    this.seek_bar.removeEventListener('change', this.on_change);
    this.media_element.removeEventListener('timeupdate', this.on_timeupdate);
    this.media_element.removeEventListener('ended', this.on_ended);
  }
};

ko.components.register('seek-bar', {
  template: `
    <input type="range" value="0" max="100" data-bind="css: {'show-seek-bar-thumb': show_seek_bar_thumb, 'element-disabled': disabled}">
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.SeekBarComponent(params, component_info);
    },
  },
});
