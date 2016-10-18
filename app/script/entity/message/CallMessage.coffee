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

# Call message entity based on z.entity.Message.
class z.entity.CallMessage extends z.entity.Message
  # Construct a new content message.
  constructor: ->
    super()
    @super_type = z.message.SuperType.CALL
    @call_message_type = ''
    @finished_reason = ''

    @caption = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_voice_channel_deactivate_you if @user().is_me
      return z.localization.Localizer.get_text z.string.conversation_voice_channel_deactivate
    , @, deferEvaluation: true

  ###
  Check if call message is call activation.

  @return [Boolean] Is message of type activate
  ###
  is_call_activation: ->
    return @call_message_type is z.message.CallMessageType.ACTIVATED

  ###
  Check if call message is call activation.

  @return [Boolean] Is message of type deactivate
  ###
  is_call_deactivation: ->
    return @call_message_type is z.message.CallMessageType.DEACTIVATED
