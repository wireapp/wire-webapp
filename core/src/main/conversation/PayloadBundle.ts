/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {
  AssetContent,
  ClientActionType,
  ConfirmationContent,
  DeletedContent,
  GenericMessageType,
  HiddenContent,
  ImageAssetContent,
  ImageContent,
  TextContent,
} from '../conversation/root';

enum PayloadBundleState {
  INCOMING = 'PayloadBundleState.INCOMING',
  OUTGOING_SENT = 'PayloadBundleState.OUTGOING_SENT',
  OUTGOING_UNSENT = 'PayloadBundleState.OUTGOING_UNSENT',
}

type PayloadBundleIncoming = PayloadBundle & {
  conversation?: string;
  messageTimer: number;
  state: PayloadBundleState.INCOMING;
};
type PayloadBundleOutgoing = PayloadBundle & {
  conversation: string;
  messageTimer: number;
  state: PayloadBundleState.OUTGOING_SENT;
};
type PayloadBundleOutgoingUnsent = PayloadBundle & {state: PayloadBundleState.OUTGOING_UNSENT};

interface PayloadBundle {
  content?:
    | TextContent
    | HiddenContent
    | DeletedContent
    | ConfirmationContent
    | AssetContent
    | ImageContent
    | ImageAssetContent
    | ClientActionType;
  from: string;
  id: string;
  state: PayloadBundleState;
  type: GenericMessageType;
}

export {PayloadBundle, PayloadBundleIncoming, PayloadBundleOutgoing, PayloadBundleOutgoingUnsent, PayloadBundleState};
