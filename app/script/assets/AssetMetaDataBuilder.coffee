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
    if @_is_video(file)
      return @_build_video_metdadata file
    else if @_is_audio(file)
      return @_build_audio_metdadata file
    else if @_is_image(file)
      return @_build_image_metdadata file
    else
      return null

  _build_video_metdadata: (videofile) ->
    new Promise (resolve, reject) ->
      videoElement = document.createElement('video')
      url = window.URL.createObjectURL videofile
      videoElement.src = url
      videoElement.onloadedmetadata = ->
        resolve new z.proto.Asset.VideoMetaData videoElement.videoWidth, videoElement.videoHeight, videoElement.duration
        window.setTimeout ->
          window.URL.revokeObjectURL url
          reject new Error('Exceeded video load timeout')
        , 100


  _build_audio_metdadata: (audiofile) ->
    z.util.load_file_buffer(audiofile)
    .then (buffer) ->
      new AudioContext().decodeAudioData(buffer)
    .then (audio_buffer) ->
      new z.proto.Asset.AudioMetaData audio_buffer.duration * 1000, @_generate_preview(audio_buffer)

  _build_image_metdadata: (imagefile) ->
    new Promise (resolve, reject) ->
      img = new Image()
      url = window.URL.createObjectURL imagefile
      img.src = url
      img.onload = ->
        resolve new z.proto.Asset.ImageMetaData img.width, img.height
        window.setTimeout ->
          window.URL.revokeObjectURL url
          reject new Error('Exceeded image load timeout')
        , 100

  _is_video: (file) ->
    file?.type?.startsWith 'video'

  _is_audio: (file) ->
    file?.type?.startsWith 'audio'

  _is_image: (file) ->
    file?.type?.startsWith 'image'

  _generate_preview: (audio_buffer) ->
    MAX_SAMPLES = 200
    AMPLIFIER = 700 # in favour of iterating all samples before we interpolate them
    preview = [0..MAX_SAMPLES - 1]
    for channelIndex in [0..audio_buffer.numberOfChannels - 1]
      channel = Array.from(audio_buffer.getChannelData(channelIndex))
      bucketSize = parseInt(channel.length / MAX_SAMPLES)
      buckets = z.util.ArrayUtil.chunk(channel, bucketSize)
      for bucket, index in buckets
        preview[index] = @_normalise_sample(@_root_mean_square(bucket) * AMPLIFIER)
      break # only select first channel
    new Uint8Array(preview)

  _root_mean_square: (float_array) ->
    pow = float_array.map((n) -> Math.pow(n, 2))
    sum = pow.reduce((p, n) -> p + n)
    Math.sqrt(sum) / float_array.length

  _normalise_sample: (value) ->
    MAX_VALUE = 255
    Math.min(Math.abs(parseInt(value * MAX_VALUE, 10)), MAX_VALUE)
