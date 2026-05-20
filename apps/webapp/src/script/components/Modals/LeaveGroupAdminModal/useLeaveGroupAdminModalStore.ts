/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';

export type LeaveGroupAdminModalParams = {
  conversation: Conversation;
  /**
   * Users eligible for admin promotion.
   * Empty array means there are no eligible users — a "no eligible users" variant is shown.
   */
  eligibleUsers: User[];
  onLeave: (clearContent: boolean, newAdmin: User | null) => Promise<void>;
  onDelete: () => void;
};

const INITIAL_UI_STATE = {
  clearContent: false,
  isLoading: false,
  selectedUser: null as User | null,
};

type LeaveGroupAdminModalState = {
  isOpen: boolean;
  params: LeaveGroupAdminModalParams | null;
  selectedUser: User | null;
  clearContent: boolean;
  isLoading: boolean;
  show: (params: LeaveGroupAdminModalParams) => void;
  hide: () => void;
  setSelectedUser: (user: User | null) => void;
  setClearContent: (clear: boolean) => void;
  setIsLoading: (loading: boolean) => void;
};

export const useLeaveGroupAdminModalStore = create<LeaveGroupAdminModalState>(set => ({
  isOpen: false,
  params: null,
  ...INITIAL_UI_STATE,
  show: params => set({isOpen: true, params, ...INITIAL_UI_STATE}),
  hide: () => set({isOpen: false, params: null, ...INITIAL_UI_STATE}),
  setSelectedUser: user => set({selectedUser: user}),
  setClearContent: clear => set({clearContent: clear}),
  setIsLoading: loading => set({isLoading: loading}),
}));
