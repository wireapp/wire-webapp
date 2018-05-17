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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.AudioSeekBarComponent = class AudioSeekBarComponent {
  /**
   * Construct a audio seek bar that renders audio levels.
   *
   * @param {Object} params - Component parameters
   * @param {HTMLElement} params.media_src - Media source
   * @param {z.entity.File} params.asset - Asset file
   * @param {boolean} params.disabled - Disabled seek bar
   * @param {Object} component_info - Component information
   */
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.audio_element = params.src;
    this.asset = params.asset;

    this.element = component_info.element;
    this.loudness = [];

    this.disabled = ko.computed(() => {
      if (typeof params.disabled === 'function') {
        $(this.element).toggleClass('element-disabled', params.disabled());
      }
    });

    if (this.asset.meta !== null && this.asset.meta.loudness !== null) {
      this.loudness = this._normalize_loudness(this.asset.meta.loudness, component_info.element.clientHeight);
    }

    this._on_resize_fired = _.debounce(() => {
      this._render_levels();
      this._on_time_update();
    }, 500);

    this._render_levels();

    this._on_level_click = this._on_level_click.bind(this);
    this._on_time_update = this._on_time_update.bind(this);
    this._on_audio_ended = this._on_audio_ended.bind(this);
    this.audio_element.addEventListener('ended', this._on_audio_ended);
    this.audio_element.addEventListener('timeupdate', this._on_time_update);
    component_info.element.addEventListener('click', this._on_level_click);
    window.addEventListener('resize', this._on_resize_fired);
  }

  _render_levels() {
    const number_of_levels_fit_on_screen = Math.floor(this.element.clientWidth / 3); // 2px + 1px
    const scaled_loudness = z.util.ArrayUtil.interpolate(this.loudness, number_of_levels_fit_on_screen);

    $(this.element).empty();
    scaled_loudness.map(level => {
      $('<span>')
        .height(level)
        .appendTo(this.element);
    });
  }

  _normalize_loudness(loudness, max) {
    const peak = Math.max(...loudness);
    return peak > max ? loudness.map(level => level * max / peak) : loudness;
  }

  _on_level_click(event) {
    const mouse_x = event.pageX - $(event.currentTarget).offset().left;
    const currentTime = this.audio_element.duration * mouse_x / event.currentTarget.clientWidth;
    this.audio_element.currentTime = Math.max(0, Math.min(currentTime, this.audio_element.duration));
    this._on_time_update();
  }

  _on_time_update() {
    const $levels = this._clear_theme();
    const index = Math.floor(this.audio_element.currentTime / this.audio_element.duration * $levels.length);
    this._add_theme(index);
  }

  _on_audio_ended() {
    this._clear_theme();
  }

  _clear_theme() {
    return $(this.element)
      .children()
      .removeClass('bg-theme');
  }

  _add_theme(index) {
    $(this.element)
      .children()
      .eq(index)
      .prevAll()
      .addClass('bg-theme');
  }

  dispose() {
    this.disabled.dispose();
    this.audio_element.removeEventListener('ended', this._on_audio_ended);
    this.audio_element.removeEventListener('timeupdate', this._on_time_update);
    this.element.removeEventListener('click', this._on_level_click);
    window.removeEventListener('resize', this._on_resize_fired);
  }
};

ko.components.register('audio-seek-bar', {
  template: '<!-- content is generated -->',
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.AudioSeekBarComponent(params, component_info);
    },
  },
});
