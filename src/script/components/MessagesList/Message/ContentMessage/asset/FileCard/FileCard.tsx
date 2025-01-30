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

import {FileCardActions} from './FileCardActions/FileCardActions';
import {FileCardCloseButton} from './FileCardCloseButton/FileCardCloseButton';
import {FileCardContent} from './FileCardContent/FileCardContent';
import {FileCardHeader} from './FileCardHeader/FileCardHeader';
import {FileCardIcon} from './FileCardIcon/FileCardIcon';
import {FileCardName} from './FileCardName/FileCardName';
import {FileCardRoot} from './FileCardRoot/FileCardRoot';
import {FileCardType} from './FileCardType/FileCardType';

interface FileCardProps {
  extension: string;
  name: string;
  size: string;
}

const FileCard = {
  Root: FileCardRoot,
  Header: FileCardHeader,
  Icon: FileCardIcon,
  Type: FileCardType,
  Actions: FileCardActions,
  CloseButton: FileCardCloseButton,
  Name: FileCardName,
  Content: FileCardContent,
};

// const PDFPreview = () => {
//   return (
//     <div
//       style={{
//         background: COLOR_V2.GRAY_30,
//         borderRadius: '8px',
//         width: '484px',
//         height: '280px',
//       }}
//     >
//       PDF Preview
//     </div>
//   );
// };

const FileCardComponent = ({extension, name, size}: FileCardProps) => {
  return (
    <FileCard.Root variant="preview" extension={extension} name={name} size={size} status="loading">
      <FileCard.Header>
        <FileCard.Icon />
        <FileCard.Type />
        <FileCard.Name truncateAfterLines={2} />
        <FileCard.Actions>
          {/* <button
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              cursor: 'pointer',
            }}
            onKeyDown={event => {
              if (isSpaceOrEnterKey(event.key)) {
                const newEvent = setContextMenuPosition(event);

                showContextMenu({
                  event: newEvent,
                  entries: [{title: 'Download', label: 'Download'}],
                  identifier: 'message-options-menu',
                });
              }
            }}
            onClick={event => {
              showContextMenu({
                event,
                entries: [{title: 'Download', label: 'Download'}],
                identifier: 'message-options-menu',
              });
            }}
          >
            <MoreIcon />
          </button> */}
          <FileCard.CloseButton onClose={() => {}} />
        </FileCard.Actions>
      </FileCard.Header>
      {/* <FileCard.Content>
        <PDFPreview />
      </FileCard.Content> */}
    </FileCard.Root>
  );
};

export {FileCardComponent as FileCard};
