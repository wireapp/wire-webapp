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

###
Enum of different backend events.
###
z.event.Backend =
  CALL:
    STATE: 'call.state'
    FLOW_ADD: 'call.flow-add'
    REMOTE_SDP: 'call.remote-sdp'
    REMOTE_CANDIDATES_ADD: 'call.remote-candidates-add'
    REMOTE_CANDIDATES_UPDATE: 'call.remote-candidates-update'
    FLOW_ACTIVE: 'call.flow-active'
    FLOW_DELETE: 'call.flow-delete'
  CONVERSATION:
    ASSET_ADD: 'conversation.asset-add'
    ASSET_META: 'conversation.asset-meta'
    ASSET_PREVIEW: 'conversation.asset-preview'
    ASSET_UPLOAD_COMPLETE: 'conversation.asset-upload-complete'
    ASSET_UPLOAD_FAILED: 'conversation.asset-upload-failed'
    CLIENT_MESSAGE_ADD: 'conversation.client-message-add'
    CONNECT_REQUEST: 'conversation.connect-request'
    CREATE: 'conversation.create'
    KNOCK: 'conversation.knock'
    LOCATION: 'conversation.location'
    MEMBER_JOIN: 'conversation.member-join'
    MEMBER_LEAVE: 'conversation.member-leave'
    MEMBER_UPDATE: 'conversation.member-update'
    MESSAGE_ADD: 'conversation.message-add'
    MESSAGE_HIDDEN: 'conversation.message-hidden'
    MESSAGE_DELETE: 'conversation.message-delete'
    OTR_ASSET_ADD: 'conversation.otr-asset-add'
    OTR_MESSAGE_ADD: 'conversation.otr-message-add'
    RENAME: 'conversation.rename'
    TYPING: 'conversation.typing'
    VOICE_CHANNEL_ACTIVATE: 'conversation.voice-channel-activate'
    VOICE_CHANNEL_DEACTIVATE: 'conversation.voice-channel-deactivate'
  USER:
    ACTIVATE: 'user.activate'
    CONNECTION: 'user.connection'
    UPDATE: 'user.update'
    DELETE: 'user.delete'
    CLIENT:
      ADD: 'user.client-add'
      REMOVE: 'user.client-remove'
