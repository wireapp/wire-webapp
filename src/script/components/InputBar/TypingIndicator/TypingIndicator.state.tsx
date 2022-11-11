/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import create from 'zustand';

import {User} from '../../../entity/User';

type TypingUser = {
  conversationId: string;
  user: User;
};

type TypingIndicatorState = {
  typingUsers: TypingUser[];
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (user: TypingUser) => void;
  getTypingUsersInConversation: (conversationId: string) => User[];
  clearTypingUsers: () => void;
};

const useTypingIndicatorState = create<TypingIndicatorState>((set, get) => ({
  typingUsers: [],
  addTypingUser: ({conversationId, user}) =>
    set(state => {
      if (
        state.typingUsers.find(
          typingUser => typingUser.conversationId === conversationId && typingUser.user.id === user.id,
        )
      ) {
        return state;
      }
      return {typingUsers: [...state.typingUsers, {conversationId, user}]};
    }),
  removeTypingUser: ({conversationId, user: {id}}) =>
    set(state => ({
      typingUsers: state.typingUsers.filter(
        typingUser => !(typingUser.conversationId === conversationId && typingUser.user.id === id),
      ),
    })),
  getTypingUsersInConversation: conversationId =>
    get()
      .typingUsers.filter(typingUser => typingUser.conversationId === conversationId)
      .map(typingUser => typingUser.user),
  clearTypingUsers: () => set({typingUsers: []}),
}));

export {useTypingIndicatorState};
