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

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';

export enum CellNodeType {
  FILE = 'file',
  FOLDER = 'folder',
}

interface CellNodeGeneral {
  id: string;
  url?: string;
  path: string;
  mimeType?: string;
  name: string;
  sizeMb: string;
  previewImageUrl?: string;
  previewPdfUrl?: string;
  uploadedAtTimestamp: number;
  owner: string;
  conversationName: string;
  publicLink?: {
    alreadyShared: boolean;
    uuid?: string;
    url?: string;
  };
  tags: string[];
  presignedUrlExpiresAt: Date | null;
  user: User | null;
  conversation?: Conversation;
}

export interface CellFolder extends CellNodeGeneral {
  extension: string;
  type: CellNodeType;
}
export interface CellFile extends CellNodeGeneral {
  extension: string;
  type: CellNodeType;
}

export type CellNode = CellFile | CellFolder;
