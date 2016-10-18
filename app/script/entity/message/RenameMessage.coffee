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

# Rename message entity based on z.entity.SystemMessage.
class z.entity.RenameMessage extends z.entity.SystemMessage
  # Construct a new system message.
  constructor: ->
    super()
    @system_message_type = z.message.SystemMessageType.CONVERSATION_RENAME
    @caption = ko.pureComputed =>
      return z.localization.Localizer.get_text z.string.conversation_rename_you if @user().is_me
      return z.localization.Localizer.get_text z.string.conversation_rename
