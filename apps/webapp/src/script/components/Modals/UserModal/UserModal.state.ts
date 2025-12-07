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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {noop} from 'Util/util';
import {create} from 'zustand';

type UserModalState = {
  userId: QualifiedId | null;
  onClose: () => void;
  resetState: () => void;
  updateOnClose: (onClose: () => void) => void;
  updateUserId: (userId: QualifiedId | null) => void;
};

const useUserModalState = create<UserModalState>((set, get) => ({
  onClose: noop,
  resetState: () => set(state => ({...state, onClose: noop, userId: null})),
  updateOnClose: (onClose: () => void) => set(state => ({...state, onClose})),
  updateUserId: (userId: QualifiedId | null) => set(state => ({...state, userId})),
  userId: null,
}));

const showUserModal = (userId: QualifiedId, onClose = noop) => {
  const {updateOnClose, updateUserId} = useUserModalState.getState();
  updateUserId(userId);
  updateOnClose(onClose);
};

export {useUserModalState, showUserModal};
