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
z.media ?= {}

# MediaElement handler
class z.media.MediaElementHandler
  # Construct a new MediaElement handler.
  constructor: ->
    @logger = new z.util.Logger 'z.media.MediaElementHandler', z.config.LOGGER.OPTIONS

    @remote_media_elements = ko.observableArray []

  ###
  Add MediaElement for new stream.
  @param media_stream_info [z.media.MediaStreamInfo] MediaStream information
  ###
  add_media_element: (media_stream_info) =>
    remote_media_element = @_create_media_element media_stream_info
    @remote_media_elements.push remote_media_element
    @logger.log @logger.levels.INFO, "Created MediaElement of type '#{remote_media_element.nodeName.toLowerCase()}' for MediaStream of flow '#{media_stream_info.flow_id}'", remote_media_element

  ###
  Destroy the remote media element of a flow.
  @private
  @param flow_id [String] Flow ID for which to destroy the remote media element
  ###
  remove_media_element: (flow_id) =>
    for media_element in @_get_media_elements flow_id
      @_destroy_media_element media_element
      @remote_media_elements.remove media_element
      @logger.log @logger.levels.INFO, "Deleted MediaElement of type '#{media_element.tagName.toLocaleLowerCase()}' for flow '#{flow_id}'"

  ###
  Switch the output device used for all MediaElements.
  @param media_device_id [String] Media Device ID to be used for playback
  ###
  switch_media_element_output: (media_device_id) =>
    @_set_media_element_output media_element, media_device_id for media_element in @remote_media_elements()

  ###
  Create a new media element.

  @private
  @param media_stream_info [z.media.MediaStreamInfo] MediaStream information
  @return [HTMLMediaElement] HTMLMediaElement of type HTMLAudioElement that has the stream attached to it
  ###
  _create_media_element: (media_stream_info) ->
    try
      media_element = document.createElement 'audio'
      media_element.srcObject = media_stream_info.stream
      media_element.dataset['conversation_id'] = media_stream_info.conversation_id
      media_element.dataset['flow_id'] = media_stream_info.flow_id
      media_element.muted = false
      media_element.setAttribute 'autoplay', true
      return media_element
    catch error
      @logger.log @logger.levels.ERROR,
        "Unable to create AudioElement for flow '#{media_stream_info.flow_id}'", error

  ###
  Stop the media element.
  @param media_element [HTMLMediaElement] A HTMLMediaElement that has the media stream attached to it
  ###
  _destroy_media_element: (media_element) ->
    return if not media_element
    media_element.pause()
    media_element.srcObject = undefined

  ###
  Get all the MediaElements related to a given flow ID.
  @param flow_id [String] ID of flow to search MediaElements for
  @return [Array<HTMLMediaElement>] Related MediaElements
  ###
  _get_media_elements: (flow_id) ->
    return (media_element for media_element in @remote_media_elements() when flow_id is media_element.dataset['flow_id'])

  ###
  Change the output device used for audio playback of a media element.
  @param media_element [HTMLMediaElement] HTMLMediaElement to change playback device for
  @param sink_id [String] ID of MediaDevice to be used
  ###
  _set_media_element_output: (media_element, sink_id) ->
    media_element.setSinkId sink_id
    .then =>
      @logger.log @logger.levels.INFO, "Audio output device attached to flow '#{media_element.dataset['flow_id']} changed to '#{sink_id}'", media_element
    .catch (error) =>
      @logger.log @logger.levels.INFO,
        "Failed to attach audio output device '#{sink_id}' to flow '#{media_element.dataset['flow_id']}: #{error.message}", error
