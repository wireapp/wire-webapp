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

# grunt test_init && grunt test_run:calling/handler/MediaStreamHandler
window.wire ?= {}
window.wire.auth ?= {}
window.wire.auth.audio ?= {}

describe 'z.media.MediaStreamHandler', ->
  test_factory = new TestFactory()

  beforeAll (done) ->
    test_factory.exposeMediaActors()
    .then ->
      done()
    .catch done.fail


  describe 'toggle_audio_send', ->
    beforeEach ->
      spyOn media_repository.stream_handler, '_toggle_audio_enabled'

    it 'toggles the audio stream if available', (done) ->
      media_repository.stream_handler.local_media_streams.audio true

      media_repository.stream_handler.toggle_audio_send()
      .then ->
        expect(media_repository.stream_handler._toggle_audio_send).toHaveBeenCalled()
        done()
      .catch done.fail

    it 'throws an error if no audio stream is found', (done) ->
      media_repository.stream_handler.local_media_streams.audio undefined

      media_repository.stream_handler.toggle_audio_send()
      .then done.fail
      .catch (error) ->
        expect(error).toEqual jasmine.any z.media.MediaError
        expect(error.type).toBe z.media.MediaError::TYPE.NO_AUDIO_STREAM_FOUND
        done()


  describe 'toggle_video_send', ->
    beforeEach ->
      spyOn(media_repository.stream_handler, '_toggle_video_enabled').and.returnValue Promise.resolve()
      spyOn(media_repository.stream_handler, 'replace_input_source').and.returnValue Promise.resolve()

    it 'toggles the video stream if available and in video mode', (done) ->
      media_repository.stream_handler.local_media_streams.video true
      media_repository.stream_handler.local_media_type z.media.MediaType.VIDEO

      media_repository.stream_handler.toggle_video_send()
      .then ->
        expect(media_repository.stream_handler._toggle_video_send).toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).not.toHaveBeenCalled()
        done()
      .catch done.fail

    it 'turns on the video stream if it does not exist', (done) ->
      media_repository.stream_handler.local_media_streams.video undefined
      media_repository.stream_handler.local_media_type z.media.MediaType.VIDEO

      media_repository.stream_handler.toggle_video_send()
      .then ->
        expect(media_repository.stream_handler._toggle_video_send).not.toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith z.media.MediaType.VIDEO
        done()
      .catch done.fail

    it 'turns on the video stream if not in video mode', (done) ->
      media_repository.stream_handler.local_media_streams.video true
      media_repository.stream_handler.local_media_type z.media.MediaType.SCREEN

      media_repository.stream_handler.toggle_video_send()
      .then ->
        expect(media_repository.stream_handler._toggle_video_send).not.toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith z.media.MediaType.VIDEO
        done()
      .catch done.fail


  describe 'toggle_screen_send', ->
    beforeEach ->
      spyOn(media_repository.stream_handler, '_toggle_screen_enabled').and.returnValue Promise.resolve()
      spyOn(media_repository.stream_handler, 'replace_input_source').and.returnValue Promise.resolve()

    it 'toggles screen sharing if available and in screen sharing mode', (done) ->
      media_repository.stream_handler.local_media_streams.video true
      media_repository.stream_handler.local_media_type z.media.MediaType.SCREEN

      media_repository.stream_handler.toggle_screen_send()
      .then ->
        expect(media_repository.stream_handler._toggle_screen_send).toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).not.toHaveBeenCalled()
        done()
      .catch done.fail

    it 'turns on the screen sharing stream if it does not exist', (done) ->
      media_repository.stream_handler.local_media_streams.video undefined
      media_repository.stream_handler.local_media_type z.media.MediaType.SCREEN

      media_repository.stream_handler.toggle_screen_send()
      .then ->
        expect(media_repository.stream_handler._toggle_screen_send).not.toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith z.media.MediaType.SCREEN
        done()
      .catch done.fail

    it 'turns on the video stream if not in screen sharing mode', (done) ->
      media_repository.stream_handler.local_media_streams.video true
      media_repository.stream_handler.local_media_type z.media.MediaType.VIDEO

      media_repository.stream_handler.toggle_screen_send()
      .then ->
        expect(media_repository.stream_handler._toggle_screen_send).not.toHaveBeenCalled()
        expect(media_repository.stream_handler.replace_input_source).toHaveBeenCalledWith z.media.MediaType.SCREEN
        done()
      .catch done.fail
