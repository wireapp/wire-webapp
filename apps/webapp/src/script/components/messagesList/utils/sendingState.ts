/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

/** Structural, so that this module stays out of the import cycle of the message entities */
type SendingStateMessage = {
  isContent: () => boolean;
  sendingState: () => 'sent' | 'pending' | 'failed';
};

/** Messages in another sending state than the one before them start a group of their own, with their own header */
export function startsSendingStateGroup(
  message: SendingStateMessage,
  previousMessage: SendingStateMessage | undefined,
): boolean {
  return previousMessage !== undefined && message.sendingState() !== previousMessage.sendingState();
}

/** The message the offline notice goes above: the first one that waits to be sent */
export function findFirstPendingMessage<Message extends SendingStateMessage>(
  messages: readonly Message[],
): Message | undefined {
  return messages.find(message => {
    return message.isContent() && message.sendingState() === 'pending';
  });
}
