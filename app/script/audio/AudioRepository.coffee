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

# Enum of audio settings.
z.audio.AudioSetting =
  ALL: 'all'
  NONE: 'none'
  SOME: 'some'

AUDIO_PATH = '/audio'

# Audio repository for all audio interactions.
class z.audio.AudioRepository
  # Construct a new Audio Repository.
  constructor: ->
    @logger = new z.util.Logger 'z.audio.AudioRepository', z.config.LOGGER.OPTIONS
    @audio_context = undefined
    @in_loop = {}
    @_init_sound_manager()
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
    else if window.AudioContext
      @audio_context = new window.AudioContext()
      @logger.log @logger.levels.INFO, 'Initialized a new AudioContext', @audio_context
      return @audio_context
    else
      @logger.log @logger.levels.ERROR, 'The flow audio cannot use the Web Audio API as it is unavailable.'
      return undefined

  ###
  Initialize a sound.

  @private
  @param id [z.audio.AudioType] ID of the sound
  @param url [String] URL of sound file
  @return [Function] Function to set up the sound in SoundManager
  ###
  _init_sound: (id, url) ->
    return soundManager.createSound id: id, url: url

  # Initialize all sounds.
  _init_sounds: ->
    @alert = @_init_sound z.audio.AudioType.ALERT, "#{AUDIO_PATH}/alert.mp3"
    @call_drop = @_init_sound z.audio.AudioType.CALL_DROP, "#{AUDIO_PATH}/call_drop.mp3"
    @network_interruption = @_init_sound z.audio.AudioType.NETWORK_INTERRUPTION, "#{AUDIO_PATH}/nw_interruption.mp3"
    @new_message = @_init_sound z.audio.AudioType.NEW_MESSAGE, "#{AUDIO_PATH}/new_message.mp3"
    @ping_from_me = @_init_sound z.audio.AudioType.OUTGOING_PING, "#{AUDIO_PATH}/ping_from_me.mp3"
    @ping_from_them = @_init_sound z.audio.AudioType.INCOMING_PING, "#{AUDIO_PATH}/ping_from_them.mp3"
    @ready_to_talk = @_init_sound z.audio.AudioType.READY_TO_TALK, "#{AUDIO_PATH}/ready_to_talk.mp3"
    @ringing_from_me = @_init_sound z.audio.AudioType.OUTGOING_CALL, "#{AUDIO_PATH}/ringing_from_me.mp3"
    @ringing_from_them = @_init_sound z.audio.AudioType.INCOMING_CALL, "#{AUDIO_PATH}/ringing_from_them.mp3"
    @talk_later = @_init_sound z.audio.AudioType.TALK_LATER, "#{AUDIO_PATH}/talk_later.mp3"

  # Use Amplify to subscribe to all audio playback related events.
  _subscribe_to_audio_events: ->
    amplify.subscribe z.event.WebApp.AUDIO.PLAY, @, @_play
    amplify.subscribe z.event.WebApp.AUDIO.PLAY_IN_LOOP, @, @_play_in_loop
    amplify.subscribe z.event.WebApp.AUDIO.STOP, @, @_stop

  # Use Amplify to subscribe to all audio properties related events.
  _subscribe_to_audio_properties: ->
    @sound_setting = ko.observable z.audio.AudioSetting.ALL
    @sound_setting.subscribe (sound_setting) =>
      @_stop_all() if sound_setting is z.audio.AudioSetting.NONE

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, (properties) =>
      @sound_setting properties.settings.sound.alerts

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATE.SOUND_ALERTS, (value) =>
      @sound_setting value

  # Initialize the SoundManager.
  _init_sound_manager: ->
    soundManager.setup
      debugMode: false
      useConsole: false
      onready: =>
        @_init_sounds()
        @_subscribe_to_audio_events()

  ###
  Start playback of a sound
  @param audio_id [String] Sound that should be played
  ###
  _play: (audio_id) ->
    audio = soundManager.getSoundById audio_id

    return if @sound_setting() is z.audio.AudioSetting.NONE and audio_id not in z.audio.AudioPlayingType.NONE
    return if @sound_setting() is z.audio.AudioSetting.SOME and audio_id not in z.audio.AudioPlayingType.SOME

    @logger.log "Playing sound: #{audio_id}", audio
    audio.play()

  ###
  Start playback of a sound in a loop.

  @note Prevent playing multiples instances of looping sounds
  @param audio [Object] SoundManager sound object
  @param is_first_time [Boolean] Is this the initial call or an on finish loop
  ###
  _play_in_loop: (audio_id, is_first_time = true) ->
    audio = soundManager.getSoundById audio_id

    return if @sound_setting() is z.audio.AudioSetting.NONE and audio_id not in z.audio.AudioPlayingType.NONE
    return if @sound_setting() is z.audio.AudioSetting.SOME and audio_id not in z.audio.AudioPlayingType.SOME

    if not @in_loop[audio_id]
      @logger.log "Looping sound: #{audio_id}", audio
      @in_loop[audio_id] = audio_id
    else
      return if is_first_time

    audio.play onfinish: =>
      @_play_in_loop audio.id, false

  ###
  Stop playback of a sound.
  @param audio [Object] SoundManager sound object
  ###
  _stop: (audio_id) ->
    audio = soundManager.getSoundById audio_id

    @logger.log "Stopping sound: #{audio_id}", audio
    audio.stop()

    delete @in_loop[audio_id] if @in_loop[audio_id]

  # Stop all sounds playing in loop.
  _stop_all: ->
    @_stop sound for sound of @in_loop
