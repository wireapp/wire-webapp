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

import {AlertIcon, UnavailableFileIcon} from '@wireapp/react-ui-kit';

import {FileTypeIcon} from 'Components/Conversation/common/FileTypeIcon/FileTypeIcon';

import {errorIconStyles, unavailableIconStyles} from './FileCardIcon.styles';

import {useFileCardContext} from '../common/FileCardContext/FileCardContext';

interface FileCardIconProps {
  type?: 'file' | 'error' | 'unavailable';
}

export const FileCardIcon = ({type = 'file'}: FileCardIconProps) => {
  const {extension} = useFileCardContext();

  if (type === 'error') {
    return <AlertIcon css={errorIconStyles} width={14} height={14} />;
  }

  if (type === 'unavailable') {
    return <UnavailableFileIcon css={unavailableIconStyles} width={14} height={14} />;
  }

  return <FileTypeIcon extension={extension} />;
};
