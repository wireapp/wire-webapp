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

import {FileCardActions} from './filecardactions/filecardactions';
import {FileCardCloseButton} from './filecardclosebutton/filecardclosebutton';
import {FileCardContent} from './filecardcontent/filecardcontent';
import {FileCardError} from './filecarderror/filecarderror';
import {FileCardHeader} from './filecardheader/filecardheader';
import {FileCardIcon} from './filecardicon/filecardicon';
import {FileCardLoading} from './filecardloading/filecardloading';
import {FileCardName} from './filecardname/filecardname';
import {FileCardRoot} from './filecardroot/filecardroot';
import {FileCardType} from './filecardtype/filecardtype';

/**
 * Compound component that displays file information in a card format.
 * It supports various states including loading, error, and different file types.
 *
 * @example Basic usage
 * ```tsx
 * <FileCard.Root variant="small" extension="docx" name="Monthly report" size="7.1 MB">
 *   <FileCard.Header>
 *     <FileCard.Icon />
 *     <FileCard.Type />
 *     <FileCard.Actions>
 *       <FileCard.CloseButton label="Close" onClose={() => {}} />
 *     </FileCard.Actions>
 *   </FileCard.Header>
 *   <FileCard.Name truncateAfterLines={2} />
 *   <FileCard.Loading progress={50} />
 * </FileCard.Root>
 * ```
 *
 * @example With an additional content
 * ```tsx
 * <FileCard.Root variant="large" extension="pdf" name="Project status report" size="1.2 MB">
 *   <FileCard.Header>
 *     <FileCard.Icon />
 *     <FileCard.Type />
 *     <FileCard.Name />
 *     <FileCard.Actions>
 *       <FileCard.CloseButton label="Close" onClose={() => {}} />
 *     </FileCard.Actions>
 *   </FileCard.Header>
 *   <FileCard.Content>
 *     <PDFPreview />
 *   </FileCard.Content>
 * </FileCard.Root>
 * ```
 *
 * @example Error state
 * ```tsx
 * <FileCard.Root variant="small" extension="mp3" name="Meeting recording" size="2.6 MB">
 *   <FileCard.Header>
 *     <FileCard.Icon />
 *     <FileCard.Type />
 *   </FileCard.Header>
 *   <FileCard.Name truncateAfterLines={2} />
 *   <FileCard.Error />
 * </FileCard.Root>
 * ```
 */
export const FileCard = {
  Root: FileCardRoot,
  Header: FileCardHeader,
  Icon: FileCardIcon,
  Type: FileCardType,
  Actions: FileCardActions,
  CloseButton: FileCardCloseButton,
  Name: FileCardName,
  Content: FileCardContent,
  Loading: FileCardLoading,
  Error: FileCardError,
};
