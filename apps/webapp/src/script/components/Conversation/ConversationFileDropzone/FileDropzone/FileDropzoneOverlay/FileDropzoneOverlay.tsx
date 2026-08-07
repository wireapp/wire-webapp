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

import {BlockIcon, SaveIcon} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  iconStyles,
  uploadIconStyles,
  overlayActiveStyles,
  overlayStyles,
  descriptionStyles,
  titleStyles,
} from './FileDropzoneOverlay.styles';

export type FileDropzoneOverlayMode = 'upload' | 'restricted';

interface FileDropzoneOverlayProps {
  isActive: boolean;
  mode: FileDropzoneOverlayMode;
}

export const FileDropzoneOverlay = ({isActive, mode}: FileDropzoneOverlayProps) => {
  const {translate} = useApplicationContext();

  const isRestricted = mode === 'restricted';
  const title = isRestricted
    ? translate('conversationFileUploadRestrictedOverlayTitle')
    : translate('conversationFileUploadOverlayTitle');
  const description = isRestricted
    ? translate('conversationFileUploadRestrictedOverlayDescription')
    : translate('conversationFileUploadOverlayDescription');

  return (
    <div css={isActive ? overlayActiveStyles : overlayStyles} aria-hidden={!isActive}>
      {isRestricted ? (
        <BlockIcon width={24} height={24} css={iconStyles} />
      ) : (
        <SaveIcon width={24} height={24} css={[iconStyles, uploadIconStyles]} />
      )}
      <p css={titleStyles}>{title}</p>
      <p css={descriptionStyles}>{description}</p>
    </div>
  );
};
