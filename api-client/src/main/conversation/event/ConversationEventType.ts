//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software = you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

enum ConversationEventType {
  CONNECT_REQUEST = 'conversation.connect-request',
  CREATE = 'conversation.create',
  DELETE = 'delete',
  MEMBER_JOIN = 'conversation.member-join',
  MEMBER_LEAVE = 'conversation.member-leave',
  MEMBER_UPDATE = 'conversation.member-update',
  OTR_ASSET_ADD = 'conversation.otr-asset-add',
  OTR_MESSAGE_ADD = 'conversation.otr-message-add',
  RENAME = 'conversation.rename',
  TYPING = 'conversation.typing',
}

export default ConversationEventType;
