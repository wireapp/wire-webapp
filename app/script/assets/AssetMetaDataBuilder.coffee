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
z.assets ?= {}

# Builder for creating all kinds of asset metadata
z.assets.AssetMetaDataBuilder =

  ###
  Constructs corresponding asset metadata depending on the given file type

  @param file [File] the file to generate metadata for
  @return metadata [ImageMetaData, VideoMetaData, AudioMetaData]
  ###
  build_metadata: (file) ->
    @logger = new z.util.Logger 'z.assets.AssetMetaDataBuilder', z.config.LOGGER.OPTIONS
    if @is_video file
      return @_build_video_metdadata file
    else if @is_audio file
      return @_build_audio_metdadata file
    else if @is_image file
      return @_build_image_metdadata file
    else
      return Promise.resolve()

  is_video: (file) ->
    file?.type?.startsWith 'video'

  is_audio: (file) ->
    file?.type?.startsWith 'audio'

  is_image: (file) ->
    file?.type?.startsWith 'image'

  _build_video_metdadata: (videofile) ->
    return new Promise (resolve, reject) ->
      url = window.URL.createObjectURL videofile
      videoElement = document.createElement 'video'
      videoElement.onloadedmetadata = ->
        resolve new z.proto.Asset.VideoMetaData videoElement.videoWidth, videoElement.videoHeight, videoElement.duration
        window.URL.revokeObjectURL url
      videoElement.onerror = (error) ->
        reject error
        window.URL.revokeObjectURL url
      videoElement.src = url

  _build_image_metdadata: (imagefile) ->
    return new Promise (resolve, reject) ->
        url = window.URL.createObjectURL imagefile
        img = new Image()
        img.onload = ->
          resolve new z.proto.Asset.ImageMetaData img.width, img.height
          window.URL.revokeObjectURL url
        img.onerror = (error) ->
          reject error
          window.URL.revokeObjectURL url
        img.src = url

  _build_audio_metdadata: (audiofile) ->
    z.util.load_file_buffer audiofile
    .then (buffer) ->
      audioContext = new AudioContext()
      audioContext.close()
      audioContext.decodeAudioData buffer
    .then (audio_buffer) ->
      return new z.proto.Asset.AudioMetaData audio_buffer.duration * 1000, z.assets.AssetMetaDataBuilder._normalise_loudness audio_buffer

  _normalise_loudness: (audio_buffer) ->
    MAX_SAMPLES = 200
    AMPLIFIER = 700 # in favour of iterating all samples before we interpolate them
    preview = [0..MAX_SAMPLES]
    for channel_index in [0..audio_buffer.numberOfChannels]
      channel = Array.from audio_buffer.getChannelData channel_index
      bucket_size = parseInt channel.length / MAX_SAMPLES
      buckets = z.util.ArrayUtil.chunk channel, bucket_size
      for bucket, bucket_index in buckets
        preview[bucket_index] = z.util.NumberUtil.cap_to_byte AMPLIFIER * z.util.NumberUtil.root_mean_square bucket
      break # only select first channel
    return new Uint8Array preview
