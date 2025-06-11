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

export interface CellFile {
  id: string;
  type: 'file';
  url?: string;
  path: string;
  mimeType?: string;
  name: string;
  extension: string;
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
}

export interface CellFolder {
  id: string;
  type: 'folder';
  url?: string;
  path: string;
  mimeType?: string;
  name: string;
  sizeMb: string;
  uploadedAtTimestamp: number;
  conversationName: string;
  owner: string;
  publicLink?: {
    alreadyShared: boolean;
    uuid?: string;
    url?: string;
  };
  tags: string[];
}

export type CellNode = CellFile | CellFolder;
