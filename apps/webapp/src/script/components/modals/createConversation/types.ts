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

export enum ConversationAccess {
  Public,
  Private,
}

/**
 * Enum representing the chat history options for a conversation.
 */
export enum ChatHistory {
  Off,
  OneDay,
  OneWeek,
  Unlimited,
  Custom,
}

/**
 * Enum representing the type of conversation.
 */
export enum ConversationType {
  Group,
  Channel,
}

/**
 * Enum representing the steps in the conversation creation process.
 */
export enum ConversationCreationStep {
  ConversationDetails = 0,
  Preference,
  ParticipantsSelection,
}

/**
 * Enum representing the units of time for history sharing.
 */
export enum HistorySharingUnit {
  Days,
  Weeks,
  Months,
}
