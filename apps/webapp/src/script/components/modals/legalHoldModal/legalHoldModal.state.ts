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

import {isUndefined} from '@sindresorhus/is';
import {create} from 'zustand';

import {LegalHoldModalType} from 'Components/modals/legalHoldModal/legalHoldModal';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';

type LegalHoldModalState = {
  type: LegalHoldModalType | null;
  isOpen: boolean;
  isLoading: boolean;
  users: User[];
  isSelfInfo: boolean;
  isInitialized: boolean;
  closeModal: () => void;
  setType: (type: LegalHoldModalType | null) => void;
  setUsers: (users: User[]) => void;
  setIsModalOpen: (isOpen: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  showRequestModal: (initialize?: boolean, showLoading?: boolean, fingerprint?: string) => void;
  setFingerprint: (fingerprint?: string) => void;
  closeRequestModal: (conversationId?: string) => void;
  showUsers: (initialize?: boolean, conversation?: Conversation | null) => void;
  conversationId?: string;
  fingerprint?: string;
  conversation?: Conversation | null;
};

const legalHoldModalDefaultState: Partial<LegalHoldModalState> = {
  conversation: null,
  conversationId: '',
  fingerprint: '',
  isLoading: false,
  isOpen: false,
  isSelfInfo: false,
  type: null,
  users: [],
};

const useLegalHoldModalState = create<LegalHoldModalState>((set, get) => {
  return {
    closeModal: () => {
      return set(state => {
        return {
          ...state,
          ...legalHoldModalDefaultState,
        };
      });
    },
    closeRequestModal: (conversationId = '') => {
      if (conversationId !== get().conversationId) {
        return;
      }

      return set(state => {
        return {
          ...state,
          ...legalHoldModalDefaultState,
        };
      });
    },
    conversation: null,
    conversationId: '',
    fingerprint: '',
    isInitialized: false,
    isLoading: false,
    isOpen: false,
    isSelfInfo: false,
    setFingerprint: fingerprint => {
      const normalizedFingerprint = isUndefined(fingerprint) ? '' : fingerprint;

      return set(state => {
        return {
          ...state,
          fingerprint: normalizedFingerprint,
          isOpen: normalizedFingerprint !== '',
        };
      });
    },
    setIsLoading: isLoading => {
      return set(state => {
        return {
          ...state,
          isLoading,
        };
      });
    },
    setIsModalOpen: isOpen => {
      return set(state => {
        return {
          ...state,
          isOpen,
        };
      });
    },
    setType: type => {
      return set(state => {
        return {
          ...state,
          type,
        };
      });
    },
    setUsers: users => {
      return set(state => {
        return {
          ...state,
          users,
        };
      });
    },
    showRequestModal: (initialize = false, showLoading = false, fingerprint) => {
      const normalizedFingerprint = isUndefined(fingerprint) ? '' : fingerprint;

      return set(state => {
        return {
          ...state,
          fingerprint: normalizedFingerprint,
          isInitialized: initialize,
          isLoading: showLoading,
          isOpen: showLoading || normalizedFingerprint !== '',
          type: LegalHoldModalType.REQUEST,
        };
      });
    },
    showUsers: (initialize = false, conversation) => {
      return set(state => {
        return {
          ...state,
          conversation,
          conversationId: conversation?.id ?? 'self',
          isInitialized: initialize,
          isLoading: true,
          isOpen: true,
          isSelfInfo: conversation === null || conversation === undefined,
          type: LegalHoldModalType.USERS,
        };
      });
    },
    type: null,
    users: [],
  };
});

export {useLegalHoldModalState};
