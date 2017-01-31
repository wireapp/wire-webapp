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

class z.entity.VerificationMessage extends z.entity.Message

  constructor: ->
    super()
    @super_type = z.message.SuperType.VERIFICATION
    @should_effect_conversation_timestamp = false
    @verification_message_type = undefined

    @user_ets = ko.observableArray()
    @user_ids = ko.observableArray()

    @is_self_device = ko.pureComputed =>
      return @user_ids().length is 1 and @user_ids()[0] is @user().id

    @caption_user = ko.pureComputed =>
      return z.util.LocalizerUtil.join_names @user_ets(), z.string.Declension.NOMINATIVE

    @caption_started_using = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_device_started_using_many if @user_ids().length > 1
      return z.localization.Localizer.get_text z.string.conversation_device_started_using_one

    @caption_new_device = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_device_new_device_may if @user_ids().length > 1
      return z.localization.Localizer.get_text z.string.conversation_device_new_device_one

  click_on_device: =>
    if @is_self_device()
      amplify.publish z.event.WebApp.PREFERENCES.MANAGE_DEVICES
    else
      amplify.publish z.event.WebApp.SHORTCUT.PEOPLE
