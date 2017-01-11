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

class z.components.VideoAssetComponent
  ###
  Construct a new video asset.

  @param params [Object]
  @option asset [z.entity.File]
  ###
  constructor: (params, component_info) ->
    @logger = new z.util.Logger 'VideoAssetComponent', z.config.LOGGER.OPTIONS

    @message = ko.unwrap params.message
    @asset = @message.get_first_asset()
    @expired = @message.is_expired

    @preview_subscription = undefined

    @video_element = $(component_info.element).find('video')[0]
    @video_src = ko.observable()
    @video_time = ko.observable()

    @video_playback_error = ko.observable false
    @show_bottom_controls = ko.observable false

    @video_time_rest = ko.pureComputed =>
      return @video_element.duration - @video_time()

    if @asset.preview_resource()
      @_load_video_preview()
    else
      @preview_subscription = @asset.preview_resource.subscribe @_load_video_preview

  _load_video_preview: =>
    @asset.load_preview()
    .then (blob) =>
      @video_element.setAttribute 'poster', window.URL.createObjectURL blob
      @video_element.style.backgroundColor = '#000'

  on_loadedmetadata: =>
    @video_time @video_element.duration
    @_send_tracking_event()

  on_timeupdate: =>
    @video_time @video_element.currentTime

  on_error: (component, jquery_event) =>
    @video_playback_error true
    @logger.error 'Video cannot be played', jquery_event

  on_play_button_clicked: =>
    if @video_src()?
      @video_element?.play()
    else
      @asset.load()
      .then (blob) =>
        @video_src window.URL.createObjectURL blob
        @video_element?.play()
        @show_bottom_controls true
      .catch (error) =>
        @logger.error 'Failed to load video asset ', error

  on_pause_button_clicked: =>
    @video_element?.pause()

  on_video_playing: =>
    @video_element.style.backgroundColor = '#000'

  _send_tracking_event: =>
    duration = Math.floor @video_element.duration

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.PLAYED_VIDEO_MESSAGE,
      duration: z.util.bucket_values(duration, [0, 10, 30, 60, 300, 900, 1800])
      duration_actual: duration

  dispose: =>
    @preview_subscription?.dispose()
    window.URL.revokeObjectURL @video_src()

ko.components.register 'video-asset',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.VideoAssetComponent params, component_info
  template: """
            <!-- ko ifnot: expired() -->
              <div class="video-asset-container" data-uie-name="video-asset" data-bind="hide_controls: 2000, attr: {'data-uie-value': asset.file_name}">
                <video data-bind="attr: {src: video_src},
                                  css: {hidden: asset.status() === z.assets.AssetTransferState.UPLOADING},
                                  event: { loadedmetadata: on_loadedmetadata,
                                           timeupdate: on_timeupdate,
                                           error: on_error,
                                           playing: on_video_playing}">
                </video>
                <!-- ko if: video_playback_error -->
                  <div class="video-playback-error label-xs" data-bind="l10n_text: z.string.conversation_playback_error"></div>
                <!-- /ko -->
                <!-- ko ifnot: video_playback_error -->
                  <!-- ko if: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
                    <div class="asset-placeholder">
                      <div class="three-dots">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  <!-- /ko -->
                  <!-- ko ifnot: !asset.uploaded_on_this_client() && asset.status() === z.assets.AssetTransferState.UPLOADING -->
                    <div class="video-controls-center">
                      <media-button params="src: video_element,
                                            large: true,
                                            asset: asset,
                                            play: on_play_button_clicked,
                                            pause: on_pause_button_clicked,
                                            cancel: function() {asset.cancel($parents[1])}">
                      </media-button>
                    </div>
                    <div class='video-controls-bottom' data-bind='visible: show_bottom_controls()'>
                      <seek-bar data-ui-name="status-video-seekbar" class="video-controls-seekbar" params="src: video_element"></seek-bar>
                      <span class="video-controls-time label-xs" data-uie-name="status-video-time" data-bind="text: z.util.format_seconds(video_time_rest())"></span>
                    </div>
                  <!-- /ko -->
                <!-- /ko -->
              </div>
            <!-- /ko -->
            """
