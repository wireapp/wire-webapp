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

import {forwardRef, ReactNode, useState} from 'react';

import {FileCard} from 'Components/fileCard/filecard';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {contentWrapperStyles} from './videoassetcard.styles';

import {FileAssetOptions} from '../../../fileassetcard/common/fileassetoptions/fileassetoptions';
import {FilePreviewModal} from '../../../fileassetcard/common/filepreviewmodal/filepreviewmodal';

interface VideoAssetCardProps {
  src?: string;
  extension: string;
  name: string;
  size: string;
  senderName: string;
  timestamp: number;
  isError?: boolean;
  isLoading?: boolean;
  children: ReactNode;
  id: string;
}

export const VideoAssetCard = forwardRef<HTMLDivElement, VideoAssetCardProps>(
  ({extension, name, size, isError, children, src, senderName, timestamp, id}, ref) => {
    const {translate} = useApplicationContext();
    const [isOpen, setIsOpen] = useState(false);
    const formattedName = isError === true ? translate('cells.unavailableFile') : name;

    return (
      <FileCard.Root variant="large" extension={extension} name={formattedName} size={size}>
        <FileCard.Header>
          <FileCard.Icon type={isError === true ? 'unavailable' : 'file'} />
          {isError !== true && <FileCard.Type />}
          <FileCard.Name variant={isError === true ? 'secondary' : 'primary'} />
          <FileAssetOptions id={id} src={src} name={name} extension={extension} onOpen={() => setIsOpen(true)} />
        </FileCard.Header>
        <FileCard.Content>
          <div ref={ref} css={contentWrapperStyles}>
            {children}
          </div>
        </FileCard.Content>
        <FilePreviewModal
          id={id}
          fileUrl={src}
          fileName={name}
          fileExtension={extension}
          senderName={senderName}
          timestamp={timestamp}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          isLoading={false}
          isError={false}
        />
      </FileCard.Root>
    );
  },
);

VideoAssetCard.displayName = 'VideoAssetCard';
