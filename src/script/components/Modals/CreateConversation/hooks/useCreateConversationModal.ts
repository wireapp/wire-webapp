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

import {User} from 'src/script/entity/User';

import {
  ConversationAccess,
  ConversationModerator,
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
  moderator: ConversationModerator;
  chatHistory: ChatHistory;
  conversationType: ConversationType;
  conversationCreationStep: ConversationCreationStep;
  error: string;
  isReadReceiptsEnabled: boolean;
  isGuestsEnabled: boolean;
  selectedContacts: User[];
  historySharingQuantity: number;
  historySharingUnit: HistorySharingUnit;
  isCustomHistoryModalOpen: boolean;
  isConfirmConversationTypeModalOpen: boolean;
  isCreateTeamModalOpen: boolean;
  isUpgradeTeamModalOpen: boolean;
  isServicesEnabled: boolean;

  showModal: () => void;
  hideModal: () => void;
  setConversationName: (name: string) => void;
  setAccess: (access: ConversationAccess) => void;
  setModerator: (access: ConversationModerator) => void;
  setChatHistory: (history: ChatHistory) => void;
  setConversationType: (type: ConversationType) => void;
  setConversationCreationStep: (step: ConversationCreationStep) => void;
  gotoNextStep: () => void;
  gotoPreviousStep: () => void;
  setError: (error: string) => void;
  setIsReadReceiptsEnabled: (isReadReceiptsEnabled: boolean) => void;
  setIsGuestsEnabled: (isGuestsEnabled: boolean) => void;
  setSelectedContacts: (contacts: User[]) => void;
  setHistorySharingQuantity: (quantity: number) => void;
  setHistorySharingUnit: (unit: HistorySharingUnit) => void;
  setIsCustomHistoryModalOpen: (isOpen: boolean) => void;
  setIsConfirmConversationTypeModalOpen: (isOpen: boolean) => void;
  setIsCreateTeamModalOpen: (isOpen: boolean) => void;
  setIsUpgradeTeamModalOpen: (isOpen: boolean) => void;
  gotoLastStep: () => void;
  setIsServicesEnabled: (isServicesEnabled: boolean) => void;
};

/**
 * Initial state of the Create Conversation Modal.
 */
const initialState = {
  isOpen: false,
  conversationName: '',
  access: ConversationAccess.Private,
  moderator: ConversationModerator.AdminsAndMembers,
  chatHistory: ChatHistory.Off,
  conversationType: ConversationType.Channel,
  conversationCreationStep: ConversationCreationStep.ConversationDetails,
  error: '',
  isReadReceiptsEnabled: true,
  isServicesEnabled: true,
  isGuestsEnabled: true,
  selectedContacts: [],
  historySharingUnit: HistorySharingUnit.Days,
  historySharingQuantity: 1,
  isCustomHistoryModalOpen: false,
  isConfirmConversationTypeModalOpen: false,
  isCreateTeamModalOpen: false,
  isUpgradeTeamModalOpen: false,
};

/**
 * Hook to manage the state of the Create Conversation Modal.
 */
export const useCreateConversationModal = create<CreateConversationModalState>(set => ({
  ...initialState,
  showModal: () => set(state => ({...state, isOpen: true})),
  hideModal: () => set({...initialState}),
  setConversationName: (name: string) => set({conversationName: name}),
  setAccess: (access: ConversationAccess) =>
    set(state => ({
      access,
      manager: access === ConversationAccess.Public ? ConversationModerator.AdminsAndMembers : state.moderator,
    })),
  setModerator: (moderator: ConversationModerator) => set({moderator}),
  setChatHistory: (history?: ChatHistory) => set({chatHistory: history || ChatHistory.Off}),
  setConversationType: (type: ConversationType) => set({conversationType: type}),
  setConversationCreationStep: (step: ConversationCreationStep) => set({conversationCreationStep: step}),
  gotoNextStep: () => set(state => ({...state, conversationCreationStep: state.conversationCreationStep + 1})),
  gotoLastStep: () => set({conversationCreationStep: ConversationCreationStep.ParticipantsSelection}),
  gotoPreviousStep: () => set(state => ({...state, conversationCreationStep: state.conversationCreationStep - 1})),
  setError: (error: string) => set({error}),
  setIsReadReceiptsEnabled: (isReadReceiptsEnabled: boolean) => set({isReadReceiptsEnabled}),
  setIsGuestsEnabled: (isGuestsEnabled: boolean) => set({isGuestsEnabled}),
  setSelectedContacts: (contacts: User[]) => set({selectedContacts: contacts}),
  setHistorySharingQuantity: (quantity: number) => set({historySharingQuantity: quantity}),
  setHistorySharingUnit: (unit: HistorySharingUnit) => set({historySharingUnit: unit}),
  setIsCustomHistoryModalOpen: (isOpen: boolean) => set({isCustomHistoryModalOpen: isOpen}),
  setIsConfirmConversationTypeModalOpen: (isOpen: boolean) => set({isConfirmConversationTypeModalOpen: isOpen}),
  setIsCreateTeamModalOpen: (isOpen: boolean) => set({isCreateTeamModalOpen: isOpen}),
  setIsUpgradeTeamModalOpen: (isOpen: boolean) => set({isUpgradeTeamModalOpen: isOpen}),
  setIsServicesEnabled: (isServicesEnabled: boolean) => set({isServicesEnabled}),
}));
