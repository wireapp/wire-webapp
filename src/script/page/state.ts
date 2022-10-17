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

import {LegalHoldModalType} from 'Components/Modals/LegalHoldModal/LegalHoldModal';
import {splitFingerprint} from 'Util/StringUtil';

import {PanelEntity, PanelState} from './RightSidebar/RightSidebar';

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

type RightSidebarParams = {
  entity: PanelEntity | null;
  showLikes?: boolean;
  highlighted?: User[];
};

type AppMainState = {
  legalHoldModal: {
    type: LegalHoldModalType | null;
    isOpen: boolean;
    isLoading: boolean;
    isRequestModal: boolean;
    users: User[];
    skipUsers: boolean;
    isSelfInfo: boolean;
    isInitialized: boolean;
    closeModal: () => void;
    setType: (type: LegalHoldModalType) => void;
    setUsers: (users: User[]) => void;
    setSkipUsers: (skipUsers: boolean) => void;
    setIsModalOpen: (isOpen: boolean) => void;
    setIsRequestModal: (isRequestModal: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    showRequestModal: (initialize?: boolean, showLoading?: boolean, fingerprint?: string) => void;
    setFingerprint: (fingerprint?: string) => void;
    closeRequestModal: (conversationId?: string) => void;
    showUsers: (initialize?: boolean, conversation?: Conversation | null) => void;
    conversationId?: string;
    fingerprint?: string;
    conversation?: Conversation | null;
  };
  rightSidebar: {
    clearHistory: () => void;
    entity: RightSidebarParams['entity'];
    goBack: (entity: RightSidebarParams['entity']) => void;
    goTo: (panel: PanelState, params: RightSidebarParams) => void;
    goToRoot: (entity: RightSidebarParams['entity']) => void;
    highlightedUsers: RightSidebarParams['highlighted'];
    history: PanelState[];
    showLikes: RightSidebarParams['showLikes'];
    updateEntity: (entity: RightSidebarParams['entity']) => void;
  };
};

const legalHoldModalDefaultState = {
  conversation: null,
  conversationId: '',
  fingerprint: '',
  isLoading: false,
  isOpen: false,
  isRequestModal: false,
  isSelfInfo: false,
  skipUsers: false,
  type: null,
  users: [],
};

const useAppMainState = create<AppMainState>((set, get) => {
  return {
    legalHoldModal: {
      closeModal: () =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            ...legalHoldModalDefaultState,
          },
        })),
      closeRequestModal: conversationId => {
        if (conversationId !== get().legalHoldModal.conversationId) {
          return;
        }

        return set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            ...legalHoldModalDefaultState,
          },
        }));
      },
      conversation: null,
      conversationId: '',
      fingerprint: '',
      isInitialized: false,
      isLoading: false,
      isOpen: false,
      isRequestModal: false,
      isSelfInfo: false,
      setFingerprint: (fingerprint = '') => {
        const formattedFingerprint = fingerprint
          ? splitFingerprint(fingerprint)
              .map(part => `<span>${part} </span>`)
              .join('')
          : '';

        return set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            fingerprint: formattedFingerprint,
            isOpen: !!formattedFingerprint,
          },
        }));
      },
      setIsLoading: isLoading =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            isLoading,
          },
        })),
      setIsModalOpen: isOpen =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            isOpen,
          },
        })),
      setIsRequestModal: isRequestModal =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            isRequestModal,
          },
        })),
      setSkipUsers: skipUsers =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            skipUsers,
          },
        })),
      setType: type =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            type,
          },
        })),
      setUsers: users =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            users,
          },
        })),
      showRequestModal: (initialize = false, showLoading = false, fingerprint) => {
        const formattedFingerprint = fingerprint
          ? splitFingerprint(fingerprint)
              .map(part => `<span>${part} </span>`)
              .join('')
          : '';

        return set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            fingerprint: formattedFingerprint,
            isInitialized: initialize,
            isLoading: showLoading,
            isOpen: showLoading,
            isRequestModal: true,
            type: LegalHoldModalType.REQUEST,
          },
        }));
      },
      showUsers: (initialize = false, conversation) =>
        set(state => ({
          ...state,
          legalHoldModal: {
            ...state.legalHoldModal,
            conversation,
            conversationId: conversation ? conversation?.id : 'self',
            isInitialized: initialize,
            isLoading: true,
            isOpen: true,
            isSelfInfo: !conversation,
            type: LegalHoldModalType.USERS,
          },
        })),
      skipUsers: false,
      type: null,
      users: [],
    },
    rightSidebar: {
      clearHistory: () =>
        set(state => ({
          ...state,
          rightSidebar: {
            ...state.rightSidebar,
            currentState: null,
            entity: null,
            highlightedUsers: [],
            history: [],
            showLikes: false,
          },
        })),
      entity: null,
      goBack: (entity: RightSidebarParams['entity']) =>
        set(state => ({
          ...state,
          rightSidebar: {...state.rightSidebar, entity, history: state.rightSidebar.history.slice(0, -1)},
        })),
      goTo: (panel: PanelState, params: RightSidebarParams) =>
        set(state => ({
          ...state,
          rightSidebar: {
            ...state.rightSidebar,
            entity: params?.entity || null,
            highlightedUsers: params?.highlighted || [],
            history: [...state.rightSidebar.history, panel],
            showLikes: !!params?.showLikes,
          },
        })),
      goToRoot: (entity: RightSidebarParams['entity']) =>
        set(state => ({
          ...state,
          rightSidebar: {...state.rightSidebar, entity, history: [PanelState.CONVERSATION_DETAILS]},
        })),
      highlightedUsers: [],
      history: [],
      showLikes: false,
      updateEntity: (entity: RightSidebarParams['entity']) =>
        set(state => ({...state, rightSidebar: {...state.rightSidebar, entity}})),
    },
  };
});

export {useAppMainState};
