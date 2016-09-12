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
z.event ?= {}

z.event.Client =
  CONVERSATION:
    ASSET_META: 'conversation.asset-meta'
    ASSET_PREVIEW: 'conversation.asset-preview'
    ASSET_UPLOAD_COMPLETE: 'conversation.asset-upload-complete'
    ASSET_UPLOAD_FAILED: 'conversation.asset-upload-failed'
    CONFIRMATION: 'conversation.confirmation'
    DELETE_EVERYWHERE: 'conversation.delete-everywhere'
    LOCATION: 'conversation.location'
    MESSAGE_DELETE: 'conversation.message-delete'
    MESSAGE_HIDDEN: 'conversation.message-hidden'
    REACTION: 'conversation.reaction'
    UNABLE_TO_DECRYPT: 'conversation.unable-to-decrypt'
