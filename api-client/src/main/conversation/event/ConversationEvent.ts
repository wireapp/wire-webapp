//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
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

interface ConversationEvent {
  conversation: string;
  from: string;
  time: string;
  type:
    | 'conversation.connect-request'
    | 'conversation.create'
    | 'conversation.delete'
    | 'conversation.member-join'
    | 'conversation.member-leave'
    | 'conversation.member-update'
    | 'conversation.otr-message-add'
    | 'conversation.rename'
    | 'conversation.typing';
}

export default ConversationEvent;
