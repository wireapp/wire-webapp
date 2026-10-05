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

import {ADD_PERMISSION} from '@wireapp/api-client/lib/conversation';
import {create} from 'zustand';

import {User} from 'Repositories/entity/user';

import {
  ConversationAccess,
  ChatHistory,
  ConversationType,
  ConversationCreationStep,
  HistorySharingUnit,
} from '../types';

/**
 * Type representing the state of the Create Conversation Modal.
 */
type CreateConversationModalState = {
  isOpen: boolean;
  conversationName: string;
  access: ConversationAccess;
  moderator: ADD_PERMISSION;
  chatHistory: ChatHistory;
  conversationType: ConversationType;
  conversationCreationStep: ConversationCreationStep;
  error: string;
  isReadReceiptsEnabled: boolean;
  isGuestsEnabled: boolean;
  selectedContacts: User[];
  historySharingQuantity: number;
  historySharingUnit: HistorySharingUnit;
  isCellsEnabled: boolean;
  isCustomHistoryModalOpen: boolean;
  isConfirmDiscardModalOpen: boolean;
  isCreateTeamModalOpen: boolean;
  isUpgradeTeamModalOpen: boolean;
  isServicesEnabled: boolean;
  discardTrigger?: 'modalClose' | 'conversationTypeChange';

  showModal: () => void;
  hideModal: () => void;
  setConversationName: (name: string) => void;
  setAccess: (access: ConversationAccess) => void;
  setModerator: (access: ADD_PERMISSION) => void;
  setChatHistory: (history: ChatHistory) => void;
  setConversationType: (type: ConversationType) => void;
  setConversationCreationStep: (step: ConversationCreationStep) => void;
  gotoNextStep: () => void;
  gotoPreviousStep: () => void;
  setError: (error: string) => void;
  setIsCellsEnabled: (isCellsEnabled: boolean) => void;
  setIsReadReceiptsEnabled: (isReadReceiptsEnabled: boolean) => void;
  setIsGuestsEnabled: (isGuestsEnabled: boolean) => void;
  setSelectedContacts: (contacts: User[]) => void;
  setHistorySharingQuantity: (quantity: number) => void;
  setHistorySharingUnit: (unit: HistorySharingUnit) => void;
  setIsCustomHistoryModalOpen: (isOpen: boolean) => void;
  setIsConfirmDiscardModalOpen: (isOpen: boolean) => void;
  setIsCreateTeamModalOpen: (isOpen: boolean) => void;
  setIsUpgradeTeamModalOpen: (isOpen: boolean) => void;
  gotoLastStep: () => void;
  gotoFirstStep: () => void;
  setIsServicesEnabled: (isServicesEnabled: boolean) => void;
  setDiscardTrigger: (trigger: 'modalClose' | 'conversationTypeChange') => void;
};

/**
 * Initial state of the Create Conversation Modal.
 */
const initialState = {
  isOpen: false,
  conversationName: '',
  access: ConversationAccess.Private,
  moderator: ADD_PERMISSION.EVERYONE,
  chatHistory: ChatHistory.Off,
  conversationType: ConversationType.Channel,
  conversationCreationStep: ConversationCreationStep.ConversationDetails,
  error: '',
  isCellsEnabled: false,
  isReadReceiptsEnabled: false,
  isServicesEnabled: true,
  isGuestsEnabled: true,
  selectedContacts: [] as User[],
  historySharingUnit: HistorySharingUnit.Days,
  historySharingQuantity: 1,
  isCustomHistoryModalOpen: false,
  isConfirmDiscardModalOpen: false,
  isCreateTeamModalOpen: false,
  isUpgradeTeamModalOpen: false,
};

/**
 * Hook to manage the state of the Create Conversation Modal.
 */
export const useCreateConversationModal = create<CreateConversationModalState>(set => {
  return {
    ...initialState,
    showModal: () => {
      return set(state => {
        return {...state, isOpen: true};
      });
    },
    hideModal: () => {
      return set({...initialState});
    },
    setConversationName: (name: string) => {
      return set({conversationName: name});
    },
    setAccess: (access: ConversationAccess) => {
      return set(state => {
        return {
          access,
          manager: access === ConversationAccess.Public ? ADD_PERMISSION.EVERYONE : state.moderator,
        };
      });
    },
    setModerator: (moderator: ADD_PERMISSION) => {
      return set({moderator});
    },
    setChatHistory: (history?: ChatHistory) => {
      return set({chatHistory: history ?? ChatHistory.Off});
    },
    setConversationType: (conversationType: ConversationType) => {
      return set({conversationType});
    },
    setConversationCreationStep: (step: ConversationCreationStep) => {
      return set({conversationCreationStep: step});
    },
    gotoNextStep: () => {
      return set(state => {
        return {...state, conversationCreationStep: state.conversationCreationStep + 1};
      });
    },
    gotoLastStep: () => {
      return set({conversationCreationStep: ConversationCreationStep.ParticipantsSelection});
    },
    gotoPreviousStep: () => {
      return set(state => {
        return {...state, conversationCreationStep: state.conversationCreationStep - 1};
      });
    },
    setError: (error: string) => {
      return set({error});
    },
    setIsCellsEnabled: (isCellsEnabled: boolean) => {
      return set({isCellsEnabled});
    },
    setIsReadReceiptsEnabled: (isReadReceiptsEnabled: boolean) => {
      return set({isReadReceiptsEnabled});
    },
    setIsGuestsEnabled: (isGuestsEnabled: boolean) => {
      return set({isGuestsEnabled});
    },
    setSelectedContacts: (contacts: User[]) => {
      return set({selectedContacts: contacts});
    },
    setHistorySharingQuantity: (quantity: number) => {
      return set({historySharingQuantity: quantity});
    },
    setHistorySharingUnit: (unit: HistorySharingUnit) => {
      return set({historySharingUnit: unit});
    },
    setIsCustomHistoryModalOpen: (isOpen: boolean) => {
      return set({isCustomHistoryModalOpen: isOpen});
    },
    setIsConfirmDiscardModalOpen: (isOpen: boolean) => {
      return set({isConfirmDiscardModalOpen: isOpen});
    },
    setIsCreateTeamModalOpen: (isOpen: boolean) => {
      return set({isCreateTeamModalOpen: isOpen});
    },
    setIsUpgradeTeamModalOpen: (isOpen: boolean) => {
      return set({isUpgradeTeamModalOpen: isOpen});
    },
    setIsServicesEnabled: (isServicesEnabled: boolean) => {
      return set({isServicesEnabled});
    },
    gotoFirstStep: () => {
      return set({conversationCreationStep: ConversationCreationStep.ConversationDetails});
    },
    setDiscardTrigger: (trigger: 'modalClose' | 'conversationTypeChange') => {
      return set({discardTrigger: trigger});
    },
  };
});
