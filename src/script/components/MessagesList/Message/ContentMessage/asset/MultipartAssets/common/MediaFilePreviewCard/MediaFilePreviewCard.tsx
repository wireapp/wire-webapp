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

import {ReactNode} from 'react';

import {AlertIcon} from '@wireapp/react-ui-kit';

import {
  alertIconStyles,
  errorLineStyles,
  errorLineWrapperStyles,
  iconWrapperStyles,
  loadingIconStyles,
  loadingWrapperStyles,
  wrapperStyles,
} from './MediaFilePreviewCard.styles';

import {FilePreviewErrorMoreButton} from '../FilePreviewErrorMoreButton/FilePreviewErrorMoreButton';

interface MediaFilePreviewCardProps {
  label: string;
  onRetry: () => void;
  isLoading: boolean;
  isError: boolean;
  children: ReactNode;
}

export const MediaFilePreviewCard = ({label, onRetry, isLoading, isError, children}: MediaFilePreviewCardProps) => {
  return (
    <article css={wrapperStyles} aria-label={label}>
      {children}
      {isError && (
        <>
          <div css={iconWrapperStyles}>
            <AlertIcon css={alertIconStyles} width={14} height={14} />
          </div>
          <FilePreviewErrorMoreButton onRetry={onRetry} />
          <div css={errorLineWrapperStyles}>
            <div css={errorLineStyles} />
          </div>
        </>
      )}
      {isLoading && (
        <div css={loadingWrapperStyles}>
          <div className="icon-spinner spin" css={loadingIconStyles} />
        </div>
      )}
    </article>
  );
};
