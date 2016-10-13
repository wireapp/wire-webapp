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
z.entity ?= {}

# User entity.
# Please note: The own user has a "tracking_id" & "locale"
class z.entity.User


  THEME:
    BLUE: 'theme-blue'
    GREEN: 'theme-green'
    ORANGE: 'theme-orange'
    PINK: 'theme-pink'
    PURPLE: 'theme-purple'
    RED: 'theme-red'
    YELLOW: 'theme-yellow'

  # TODO remove (don't hardcode color values), set and handle this in CSS classes
  ACCENT_COLOR:
    BLUE: '#2391d3'
    GREEN: '#00c800'
    ORANGE: '#ff8900'
    PINK: '#fe5ebd'
    PURPLE: '#9c00fe'
    RED: '#fb0807'
    YELLOW: '#febf02'

  ###
  Construct a new user entity.
  @param user_id [String] User ID
  ###
  constructor: (@id = '') ->
    @is_me = false

    @joaat_hash = -1

    @accent_id = ko.observable z.config.ACCENT_ID.BLUE
    @accent_theme = ko.pureComputed =>
      switch @accent_id()
        when z.config.ACCENT_ID.BLUE then return @THEME.BLUE
        when z.config.ACCENT_ID.GREEN then return @THEME.GREEN
        when z.config.ACCENT_ID.ORANGE then return @THEME.ORANGE
        when z.config.ACCENT_ID.PINK then return @THEME.PINK
        when z.config.ACCENT_ID.PURPLE then return @THEME.PURPLE
        when z.config.ACCENT_ID.RED then return @THEME.RED
        when z.config.ACCENT_ID.YELLOW then return @THEME.YELLOW
        else return @THEME.BLUE
    , @, deferEvaluation: true

    @accent_color = ko.pureComputed =>
      switch @accent_id()
        when z.config.ACCENT_ID.BLUE then return @ACCENT_COLOR.BLUE
        when z.config.ACCENT_ID.GREEN then return @ACCENT_COLOR.GREEN
        when z.config.ACCENT_ID.ORANGE then return @ACCENT_COLOR.ORANGE
        when z.config.ACCENT_ID.PINK then return @ACCENT_COLOR.PINK
        when z.config.ACCENT_ID.PURPLE then return @ACCENT_COLOR.PURPLE
        when z.config.ACCENT_ID.RED then return @ACCENT_COLOR.RED
        when z.config.ACCENT_ID.YELLOW then return @ACCENT_COLOR.YELLOW
        else return @ACCENT_COLOR.BLUE
    , @, deferEvaluation: true

    @email = ko.observable()
    @phone = ko.observable()

    @name = ko.observable ''
    @first_name = ko.pureComputed =>
      return @name().split(' ')[0]
    @last_name = ko.pureComputed =>
      parts = @name().split(' ')
      return parts.pop() if parts.length > 1
    @initials = ko.pureComputed =>
      initials = ''
      if @first_name()? and @last_name()?
        initials = z.util.get_first_character(@first_name()) + z.util.get_first_character(@last_name())
      else
        initials = @first_name().slice 0, 2
      return initials.toUpperCase()

    @mutual_friend_ets = ko.observableArray []
    @mutual_friend_ids = ko.observableArray []
    @mutual_friends_total = ko.observable 0

    @picture_preview = ko.observable ''
    @picture_medium = ko.observable ''
    @raw_pictures = ko.observable []

    # TODO: Quickfix for picture previews. Tiago thinks about a better solution!
    # TODO: Make sure that this function returns only an URL (without url('...'))
    @picture_preview_url = =>
      return @picture_preview() if @picture_preview().length is 0
      url = @picture_preview().substr(0, @picture_preview().indexOf('?'))
      return "#{url}?access_token=#{wire.auth.client.access_token}&conv_id=#{@id}')"

    @picture_medium_url = =>
      return @picture_medium() if @picture_medium().length is 0
      url = @picture_medium().substr(0, @picture_medium().indexOf('?'))
      return "#{url}?access_token=#{wire.auth.client.access_token}&conv_id=#{@id}')"

    @connection_level = ko.observable z.user.ConnectionLevel.UNKNOWN
    @connection = ko.observable new z.entity.Connection()

    # connection state shorthands TODO add others too since this is used very often?
    @blocked = ko.pureComputed => @connection().status() is z.user.ConnectionStatus.BLOCKED
    @connected = ko.pureComputed => @connection().status() is z.user.ConnectionStatus.ACCEPTED
    @sent = ko.pureComputed => @connection().status() is z.user.ConnectionStatus.SENT

    # e2ee
    @devices = ko.observableArray()
    @is_verified = ko.pureComputed =>
      return false if @devices().length is 0
      return @devices().every (client_et) -> client_et.meta.is_verified()

  add_client: (new_client_et) =>
    for client_et in @devices() when client_et.id is new_client_et.id
      return

    @devices.push new_client_et
    if @is_me
      @devices.sort (client_a, client_b) -> return new Date(client_b.time) - new Date(client_a.time)

  remove_client: (client_id) =>
    @devices.remove (client_et) -> client_et.id is client_id
