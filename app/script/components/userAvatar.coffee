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

class z.components.UserAvatar
  constructor: (params, component_info) ->
    @user = ko.unwrap params.user
    @badge = params.badge or false
    @element = $(component_info.element)

    if not @user?
      @user = new z.entity.User()

    @element.attr
      'id': z.util.create_random_uuid()
      'user-id': @user.id

    @initials = ko.pureComputed =>
      if @element.hasClass 'user-avatar-xs'
        return z.util.get_first_character @user.initials()
      else
        return @user.initials()

    @state = ko.pureComputed =>
      status = @user.connection().status()
      return 'self' if @user.is_me
      return 'selected' if params.selected?() is true
      return 'blocked' if status is z.user.ConnectionStatus.BLOCKED
      return 'pending' if status in [z.user.ConnectionStatus.SENT, z.user.ConnectionStatus.PENDING]
      return 'ignored' if status is z.user.ConnectionStatus.IGNORED
      return 'unknown' if status in [z.user.ConnectionStatus.UNKNOWN, z.user.ConnectionStatus.CANCELLED]
      return ''

    @css_classes = ko.pureComputed =>
      class_string = "accent-color-#{@user.accent_id()}"
      class_string += " #{@state()}" if @state()
      return class_string

    @on_click = (data, event) ->
      params.click? data.user, event.currentTarget.parentNode

    @picture_preview_subscription = ko.computed =>
      image_url = @user.picture_preview_url()
      image_was_already_loaded = false

      if image_url?
        image = new Image()
        image.onload = =>
          @avatar_image = @element.find '.user-avatar-image'
          @avatar_image.empty().append image

          window.requestAnimationFrame =>
            if not image_was_already_loaded
              @element.addClass 'user-avatar-loading-transition'
            @element.addClass 'user-avatar-image-loaded'

        image.src = z.util.strip_url_wrapper image_url
        image_was_already_loaded = image.complete

  dispose: =>
    @picture_preview_subscription.dispose()


ko.components.register 'user-avatar',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.UserAvatar params, component_info
  template: """
            <div class="user-avatar" data-bind="css: css_classes(), click: on_click">
              <div class="user-avatar-background"></div>
              <div class="user-avatar-initials" data-bind="text: initials"></div>
              <div class="user-avatar-image"></div>
              <div class="user-avatar-badge"></div>
              <div class="user-avatar-border"></div>
            </div>
            """
