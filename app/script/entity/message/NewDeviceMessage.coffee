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

class z.entity.NewDeviceMessage extends z.entity.Message

  constructor: ->
    super()
    @super_type = z.message.SuperType.NEW_DEVICE
    @should_effect_conversation_timestamp = false

    @user_ets = ko.observableArray()
    @user_ids = ko.observableArray()

    @caption_user = ko.pureComputed =>
      return z.util.LocalizerUtil.join_names @user_ets()

    @caption = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_device_started_using_you if @user().is_me
      return z.localization.Localizer.get_text z.string.conversation_device_started_using

    @caption_device = ko.pureComputed ->
      return z.localization.Localizer.get_text z.string.conversation_device_a_new_device

  click_on_device: =>
    if @user()?.is_me
      amplify.publish z.event.WebApp.PREFERENCES.MANAGE_DEVICES
    else
      amplify.subscribe z.event.WebApp.SHORTCUT.PEOPLE
