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
z.tracking ?= {}

z.tracking.SessionEventName =
  BOOLEAN:
    SEARCHED_FOR_PEOPLE: 'searchedForPeople'
  INTEGER:
    CONNECT_REQUEST_ACCEPTED: 'connectRequestsAcceptedActual'
    CONNECT_REQUEST_SENT: 'connectRequestsSentActual'
    CONVERSATION_RENAMED: 'conversationRenamesActual'
    EVENT_HIDDEN_DUE_TO_DUPLICATE_ID: 'eventHiddenDueToDuplicateIDActual'
    EVENT_HIDDEN_DUE_TO_DUPLICATE_NONCE: 'eventHiddenDueToDuplicateNonceActual'
    IMAGE_DETAIL_VIEW_OPENED: 'imageContentsClicksActual'
    IMAGE_SENT: 'imagesSentActual'
    INCOMING_CALL_ACCEPTED: 'incomingCallsAcceptedActual'
    INCOMING_CALL_MUTED: 'incomingCallsMutedActual'
    MESSAGE_SENT: 'textMessagesSentActual' # No differentiation between message with text or image
    PING_SENT: 'pingsSentActual' # No differentiation between ping or hot ping
    SEARCH_OPENED: 'openedSearchActual'
    SOUNDCLOUD_CONTENT_CLICKED: 'soundcloudContentClicksActual'
    SOUNDCLOUD_LINKS_SENT: 'soundcloudLinksSentActual'
    TOTAL_ARCHIVED_CONVERSATIONS: 'totalArchivedConversationsActual'
    TOTAL_CONTACTS: 'totalContactsActual'
    TOTAL_GROUP_CONVERSATIONS: 'totalGroupConversationsActual'
    TOTAL_INCOMING_CONNECTION_REQUESTS: 'totalIncomingConnectionRequestsActual'
    TOTAL_OUTGOING_CONNECTION_REQUESTS: 'totalOutgoingConnectionRequestsActual'
    TOTAL_SILENCED_CONVERSATIONS: 'totalSilencedConversationsActual'
    USERS_ADDED_TO_CONVERSATIONS: 'usersAddedToConversationsActual'
    VOICE_CALL_INITIATED: 'voiceCallsInitiatedActual'
    YOUTUBE_CONTENT_CLICKED: 'youtubeContentClicksActual'
    YOUTUBE_LINKS_SENT: 'youtubeLinksSentActual'
