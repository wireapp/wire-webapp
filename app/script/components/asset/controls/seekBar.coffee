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

class z.components.SeekBarComponent
  ###
  Construct a seek bar.

  @param params [Object]
  @option src [HTMLElement] media src
  ###
  constructor: (params, component_info) ->
    @media_element = params.src
    @dark_mode = params.dark
    @disabled = ko.pureComputed -> params.disabled?()

    @seek_bar = $(component_info.element).find('input')[0]
    @seek_bar_mouse_over = ko.observable false
    @seek_bar_thumb_dragged = ko.observable false

    @show_seek_bar_thumb = ko.pureComputed =>
      return @seek_bar_thumb_dragged() or @seek_bar_mouse_over()

    @seek_bar.addEventListener 'mousedown', =>
      @media_element.pause()
      @seek_bar_thumb_dragged true

    @seek_bar.addEventListener 'mouseup', =>
      @media_element.play()
      @seek_bar_thumb_dragged false

    @seek_bar.addEventListener 'mouseenter', =>
      @seek_bar_mouse_over true

    @seek_bar.addEventListener 'mouseleave', =>
      @seek_bar_mouse_over false

    @seek_bar.addEventListener 'change', =>
      time = @media_element.duration * (@seek_bar.value / 100)
      @media_element.currentTime = time

    @media_element.addEventListener 'timeupdate', =>
      value = (100 / @media_element.duration) * @media_element.currentTime
      @_update_seek_bar value

    @media_element.addEventListener 'ended', =>
      @_update_seek_bar 100

    @_update_seek_bar_style 0

  _update_seek_bar: (progress) =>
    return if @media_element.paused and progress < 100
    @seek_bar.value = progress
    @_update_seek_bar_style progress

  _update_seek_bar_style: (progress) =>
    # TODO check if we can find a css solution
    if @dark_mode
      @seek_bar.style.backgroundImage = "linear-gradient(to right, currentColor #{progress}%, rgba(141,152,159,0.24) #{progress}%)"
    else
      @seek_bar.style.backgroundImage = "linear-gradient(to right, currentColor #{progress}%, rgba(255,255,255,0.4) #{progress}%)"


ko.components.register 'seek-bar',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.SeekBarComponent params, component_info
  template: """
            <input type="range" value="0" max="100" data-bind="css: {'show-seek-bar-thumb': show_seek_bar_thumb, 'element-disabled': disabled}">
            """
