#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.components ?= {}

class z.components.AudioSeekBarComponent
  ###
  Construct a audio seek bar that renders audio levels

  @param params [Object]
  @option src [HTMLElement] media src
  @option asset [z.entity.File]
  @option disabled [Boolean]
  ###
  constructor: (params, component_info) ->
    @audio_element = params.src
    @asset = params.asset

    @element = component_info.element
    @loudness = []

    @disabled = ko.computed =>
      is_disabled = params.disabled?()
      $(@element).toggleClass 'element-disabled', is_disabled

    if @asset.meta?.loudness?.length
      @loudness = @_normalize_loudness @asset.meta.loudness, component_info.element.clientHeight

    @_on_resize_fired = _.debounce =>
      @_render_levels()
      @_on_time_update()
    , 500

    @_render_levels()

    @audio_element.addEventListener 'ended', @_on_audio_ended
    @audio_element.addEventListener 'timeupdate', @_on_time_update
    component_info.element.addEventListener 'click', @_on_level_click
    window.addEventListener 'resize', @_on_resize_fired

  _render_levels: =>
    number_of_levels_fit_on_screen = Math.floor @element.clientWidth / 3 # 2px + 1px
    scaled_loudness = z.util.ArrayUtil.interpolate @loudness, number_of_levels_fit_on_screen

    $(@element).empty()
    $('<span>').height(level).appendTo(@element) for level in scaled_loudness

  _normalize_loudness: (loudness, max) ->
    peak = Math.max.apply Math, loudness
    return if peak > max then loudness.map (level) -> level * max / peak else loudness

  _on_level_click: (e) =>
    mouse_x = e.pageX - $(e.currentTarget).offset().left
    @audio_element.currentTime = @audio_element.duration * mouse_x / e.currentTarget.clientWidth
    @_on_time_update()

  _on_time_update: =>
    $levels = @_clear_theme()
    index = Math.floor @audio_element.currentTime / @audio_element.duration * $levels.length
    @_add_theme index

  _on_audio_ended: =>
    @_clear_theme()

  _clear_theme: =>
    $(@element).children().removeClass 'bg-theme'

  _add_theme: (index) =>
    $(@element).children()
    .eq index
    .prevAll().addClass 'bg-theme'

  dispose: =>
    @disabled.dispose()
    @audio_element.removeEventListener 'ended', @_on_audio_ended
    @audio_element.removeEventListener 'timeupdate', @_on_time_update
    @element.removeEventListener 'click', @_on_level_click
    window.removeEventListener 'resize', @_on_resize_fired


ko.components.register 'audio-seek-bar',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.AudioSeekBarComponent params, component_info
  template: """<!-- content is generated -->"""
