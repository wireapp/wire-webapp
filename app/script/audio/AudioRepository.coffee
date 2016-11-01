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
z.audio ?= {}

# Audio repository for all audio interactions.
class z.audio.AudioRepository
  AUDIO_PATH: '/audio'

  # Construct a new Audio Repository.
  constructor: ->
    @logger = new z.util.Logger 'z.audio.AudioRepository', z.config.LOGGER.OPTIONS

    @audio_context = undefined

    @audio_elements = {}
    @currently_looping = {}
    @audio_preference = ko.observable z.audio.AudioPreference.ALL

    @audio_preference.subscribe (audio_preference) =>
      @_stop_all() if audio_preference is z.audio.AudioPreference.NONE

    @_subscribe_to_audio_properties()

  # Closing the AudioContext.
  close_audio_context: =>
    if @audio_context
      @audio_context.close()
      @audio_context = undefined
      @logger.log @logger.levels.INFO, 'Closed existing AudioContext'

  # Initialize the AudioContext.
  get_audio_context: =>
    if @audio_context
      @logger.log @logger.levels.INFO, 'Reusing existing AudioContext', @audio_context
      return @audio_context
    else if window.AudioContext and window.AudioContext::createMediaStreamSource
      @audio_context = new window.AudioContext()
      @logger.log @logger.levels.INFO, 'Initialized a new AudioContext', @audio_context
      return @audio_context
    else
      @logger.log @logger.levels.ERROR, 'The flow audio cannot use the Web Audio API as it is unavailable.'
      return undefined

  ###
  Initialize the repository.
  @param pre_load [Boolean] Should sounds be pre-loadedwith false as default
  ###
  init: (pre_load = false) =>
    @_init_sounds()
    @_subscribe_to_audio_events()
    @_preload() if pre_load

  ###
  Start playback of a sound in a loop.
  @note Prevent playing multiples instances of looping sounds
  @param audio_id [z.audio.AudioType] Sound identifier
  ###
  loop: (audio_id) =>
    @play audio_id, true

  ###
  Start playback of a sound.
  @param audio_id [z.audio.AudioType] Sound identifier
  @param play_in_loop [Boolean] Play sound in loop
  ###
  play: (audio_id, play_in_loop = false) =>
    @_check_sound_setting audio_id
    .then =>
      @_get_sound_by_id audio_id
    .then (audio_element) =>
      @_play audio_id, audio_element, play_in_loop
    .then (audio_element) =>
      @logger.log @logger.levels.INFO, "Playing sound '#{audio_id}' (loop: '#{play_in_loop}')", audio_element
    .catch (error) =>
      if error not instanceof z.audio.AudioError
        @logger.log @logger.levels.ERROR, "Failed playing sound '#{audio_id}': #{error.message}"
        throw error

  ###
  Stop playback of a sound.
  @param audio_id [z.audio.AudioType] Sound identifier
  ###
  stop: (audio_id) =>
    @_get_sound_by_id audio_id
    .then (audio_element) =>
      if not audio_element.paused
        @logger.log @logger.levels.INFO, "Stopping sound '#{audio_id}'", audio_element
        audio_element.pause()
      delete @currently_looping[audio_id] if @currently_looping[audio_id]
    .catch (error) =>
      @logger.log @logger.levels.ERROR, "Failed stopping sound '#{audio_id}': #{error.message}", audio_element
      throw error

  ###
  Check if sound should be played with current setting.
  @private
  @param audio_id [z.audio.AudioType] Sound identifier
  @param [Promise] Resolves if the sound should be played
  ###
  _check_sound_setting: (audio_id) ->
    return new Promise (resolve, reject) =>
      if @audio_preference() is z.audio.AudioPreference.NONE and audio_id not in z.audio.AudioPlayingType.NONE
        reject new z.audio.AudioError z.audio.AudioError::TYPE.IGNORED_SOUND
      else if @audio_preference() is z.audio.AudioPreference.SOME and audio_id not in z.audio.AudioPlayingType.SOME
        reject new z.audio.AudioError z.audio.AudioError::TYPE.IGNORED_SOUND
      else
        resolve()

  ###
  Create HTMLAudioElement.
  @param source_path [String] Source for HTMLAudioElement
  @param [HTMLAudioElement]
  ###
  _create_audio_element: (source_path) ->
    audio_element = new Audio()
    audio_element.preload = 'none'
    audio_element.src = source_path
    return audio_element

  ###
  Get the sound object
  @private
  @param audio_id [z.audio.AudioType] Sound identifier
  @return [Promise] Resolves with the HTMLAudioElement
  ###
  _get_sound_by_id: (audio_id) =>
    return new Promise (resolve, reject) =>
      if @audio_elements[audio_id]
        resolve @audio_elements[audio_id]
      else
        reject new z.audio.AudioError z.audio.AudioError::TYPE.NOT_FOUND

  ###
  Initialize all sounds.
  @private
  ###
  _init_sounds: ->
    @audio_elements[audio_id] = @_create_audio_element "#{@AUDIO_PATH}/#{audio_id}.mp3" for type, audio_id of z.audio.AudioType
    @logger.log @logger.levels.INFO, 'Initialized sounds'

  ###
  Start playback of a sound.
  @private
  @param audio_id [z.audio.AudioType] Sound identifier
  @param audio_element [HTMLAudioElement] AudioElement to play
  @param play_in_loop [Boolean] Play sound in loop
  @return [Promise] Resolves with the HTMLAudioElement
  ###
  _play: (audio_id, audio_element, play_in_loop = false) ->
    if not audio_id or not audio_element
      return Promise.reject new z.audio.AudioError z.audio.AudioError::TYPE.NOT_FOUND

    return new Promise (resolve, reject) =>
      if audio_element.paused
        audio_element.loop = play_in_loop
        audio_element.currentTime = 0 if audio_element.currentTime isnt 0
        play_promise = audio_element.play()

        _play_success = =>
          @currently_looping[audio_id] = audio_id if play_in_loop
          resolve audio_element

        if play_promise
          play_promise.then(_play_success).catch ->
            reject new z.audio.AudioError z.audio.AudioError::TYPE.FAILED_TO_PLAY
        else
          _play_success()
      else
        reject new z.audio.AudioError z.audio.AudioError::TYPE.ALREADY_PLAYING

  ###
  Preload all sounds for immediate playback.
  @private
  ###
  _preload: =>
    for audio_id, audio_element of @audio_elements
      audio_element.preload = 'auto'
      audio_element.load()
    @logger.log @logger.levels.INFO, 'Pre-loading audio files for immediate playback'

  ###
  Stop all sounds playing in loop.
  @private
  ###
  _stop_all: ->
    @stop audio_id for audio_id of @currently_looping

  # Use Amplify to subscribe to all audio playback related events.
  _subscribe_to_audio_events: ->
    amplify.subscribe z.event.WebApp.AUDIO.PLAY, @play
    amplify.subscribe z.event.WebApp.AUDIO.PLAY_IN_LOOP, @loop
    amplify.subscribe z.event.WebApp.AUDIO.STOP, @stop

  # Use Amplify to subscribe to all audio properties related events.
  _subscribe_to_audio_properties: ->
    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, (properties) =>
      @audio_preference properties.settings.sound.alerts

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, (audio_preference) =>
      @audio_preference audio_preference
