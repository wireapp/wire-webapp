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

import {create} from 'zustand';

import {User} from 'Repositories/entity/User';

type TypingUser = {
  conversationId: string;
  user: User;
  timerId: number;
};

type TypingIndicatorState = {
  typingUsers: TypingUser[];
  addTypingUser: (user: TypingUser) => void;
  removeTypingUser: (user: User, conversationId: string) => void;
  getTypingUsersInConversation: (conversationId: string) => User[];
  clearTypingUsers: () => void;
  getTypingUser: (user: User, conversationId: string) => TypingUser | undefined;
};

export const useTypingIndicatorState = create<TypingIndicatorState>((set, get) => ({
  typingUsers: [],
  addTypingUser: ({conversationId, user, timerId}) =>
    set(state => {
      if (
        state.typingUsers.find(
          typingUser => typingUser.conversationId === conversationId && typingUser.user.id === user.id,
        )
      ) {
        return state;
      }
      return {typingUsers: [...state.typingUsers, {conversationId, user, timerId}]};
    }),
  getTypingUser: (user, conversationId) =>
    get().typingUsers.find(
      typingUser => typingUser.conversationId === conversationId && typingUser.user.id === user.id,
    ),
  removeTypingUser: (user, conversationId) =>
    set(state => ({
      typingUsers: state.typingUsers.filter(
        typingUser => !(typingUser.conversationId === conversationId && typingUser.user.id === user.id),
      ),
    })),
  getTypingUsersInConversation: conversationId =>
    get()
      .typingUsers.filter(typingUser => typingUser.conversationId === conversationId)
      .map(typingUser => typingUser.user),
  clearTypingUsers: () => set({typingUsers: []}),
}));
