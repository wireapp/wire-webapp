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

import type {ComponentType} from 'react';

import type {InjectionToken} from 'tsyringe';

export interface ChatPdfModalProps {
  id: string;
  dialogId: string;
  isOpen: boolean;
  onClose: () => void;
  filePreviewUrl?: string;
  fileName: string;
  fileExtension: string;
  senderName: string;
  timestamp: number;
  status: 'loading' | 'unavailable' | 'success';
  previewType: 'pdf';
  context: 'chat';
  onDownload: () => Promise<void> | void;
}

export type ChatPdfModalComponent = ComponentType<ChatPdfModalProps>;

export const ChatPdfModalToken: InjectionToken<ChatPdfModalComponent> = Symbol('ChatPdfModalComponent');
