#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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

class z.components.MediaButtonComponent
  ###
  Construct a media button.

  @param params [Object]
  @option src [HTMLElement] media src
  @option large [Boolean] display large button
  @option asset [z.entity.File]
  ###
  constructor: (params, component_info) ->
    @media_element = params.src
    @large = params.large
    @asset = params.asset

    if @large
      component_info.element.classList.add 'media-button-lg'

    @media_is_playing = ko.observable false

    @svg_view_box = ko.pureComputed =>
      size = if @large then 64 else 32
      return "0 0 #{size} #{size}"

    @circle_upload_progress = ko.pureComputed =>
      size = if @large then '200' else '100'
      return "#{@asset.upload_progress() * 2} #{size}"

    @circle_download_progress = ko.pureComputed =>
      size = if @large then '200' else '100'
      return "#{@asset.download_progress() * 2} #{size}"

    @on_play_button_clicked = -> params.play?()
    @on_pause_button_clicked = -> params.pause?()
    @on_cancel_button_clicked = -> params.cancel?()

    @media_element.addEventListener 'playing', @on_play
    @media_element.addEventListener 'pause', @on_pause

  on_play: =>
    @media_is_playing true

  on_pause: =>
    @media_is_playing false

  dispose: =>
    @media_element.removeEventListener 'playing', @on_play
    @media_element.removeEventListener 'pause', @on_pause


ko.components.register 'media-button',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.MediaButtonComponent params, component_info
  template: """
              <!-- ko if: asset.status() === z.assets.AssetTransferState.UPLOADED -->
                <div class='media-button media-button-play icon-play' data-uie-name="do-play-media" data-bind="click: on_play_button_clicked, visible: !media_is_playing()"></div>
                <div class='media-button media-button-pause icon-pause' data-uie-name="do-pause-media" data-bind="click: on_pause_button_clicked, visible: media_is_playing()"></div>
              <!-- /ko -->
              <!-- ko if: asset.status() === z.assets.AssetTransferState.DOWNLOADING -->
                <div class="media-button icon-close" data-bind="click: asset.cancel_download" data-uie-name="status-loading-media">
                  <div class='media-button-border-fill'></div>
                  <svg class="svg-theme" data-bind="attr: {viewBox: svg_view_box}">
                    <circle data-bind="style: {'stroke-dasharray': circle_download_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
                  </svg>
                </div>
              <!-- /ko -->
              <!-- ko if: asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
                <div class="media-button icon-close" data-uie-name="do-cancel-media" data-bind="click: on_cancel_button_clicked">
                  <div class='media-button-border-fill'></div>
                  <svg class="svg-theme" data-bind="attr: {viewBox: svg_view_box}">
                    <circle data-bind="style: {'stroke-dasharray': circle_upload_progress}" class="stroke-theme" r="50%" cx="50%" cy="50%"></circle>
                  </svg>
                </div>
              <!-- /ko -->
            """
