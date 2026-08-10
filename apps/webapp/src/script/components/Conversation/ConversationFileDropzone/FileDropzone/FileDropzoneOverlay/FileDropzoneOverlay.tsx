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

import {useApplicationContext, type RootContextValue} from 'src/script/page/rootProvider';

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

const getOverlayProperties = (
  mode: FileDropzoneOverlayMode,
  isActive: boolean,
  translate: RootContextValue['translate'],
) => {
  let styles = overlayStyles;
  if (isActive) {
    styles = overlayActiveStyles;
  }

  if (mode === 'restricted') {
    return {
      styles,
      icon: <BlockIcon width={24} height={24} css={iconStyles} aria-hidden="true" />,
      title: translate('conversationFileUploadRestrictedOverlayTitle'),
      description: translate('conversationFileUploadRestrictedOverlayDescription'),
    };
  }

  return {
    styles,
    icon: <SaveIcon width={24} height={24} css={[iconStyles, uploadIconStyles]} aria-hidden="true" />,
    title: translate('conversationFileUploadOverlayTitle'),
    description: translate('conversationFileUploadOverlayDescription'),
  };
};

export const FileDropzoneOverlay = ({isActive, mode}: FileDropzoneOverlayProps) => {
  const {translate} = useApplicationContext();
  const {styles, icon, title, description} = getOverlayProperties(mode, isActive, translate);

  return (
    <div css={styles} aria-hidden={!isActive} role="status" aria-live="polite">
      {icon}
      <p css={titleStyles}>{title}</p>
      <p css={descriptionStyles}>{description}</p>
    </div>
  );
};
