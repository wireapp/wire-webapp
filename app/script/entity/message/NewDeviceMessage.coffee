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

# E2EE new device message entity based on z.entity.Message.
class z.entity.NewDeviceMessage extends z.entity.Message
  # Construct a new content message.
  constructor: ->
    super()
    @type = z.message.SuperType.NEW_DEVICE
    @device = ko.observable()
    @device_owner = ko.observable new z.entity.User()

    @unverified = ko.observable false

    # TODO
    # You started using this device -> settings
    # You started using a new device -> settings
    # John started using a new device -> profile
    # You unverified one of John's devices -> profile
    # You unverified one of your devices -> settings

    @caption = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_device_unverified if @unverified()
      return z.localization.Localizer.get_text z.string.conversation_device_started_using_you if @device_owner().is_me
      return z.localization.Localizer.get_text z.string.conversation_device_started_using

    @caption_device = ko.pureComputed =>
      if @unverified()
        return z.localization.Localizer.get_text z.string.conversation_device_your_devices if @device_owner().is_me
        return  z.localization.Localizer.get_text {
          id: z.string.conversation_device_user_devices
          replace: {placeholder: '%@name', content: @device_owner().first_name()}
        }
      else
        # TODO current device
        return z.localization.Localizer.get_text z.string.conversation_device_a_new_device

  click_on_device: =>
    # TODO device
    if @device_owner()?.is_me
      amplify.publish z.event.WebApp.PREFERENCES.MANAGE_DEVICES, @device()
    else
      amplify.subscribe z.event.WebApp.SHORTCUT.PEOPLE
