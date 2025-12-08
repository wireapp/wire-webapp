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

import {UnavailableFileIcon} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {
  errorIconStyles,
  errorTextStyles,
  loadingIconStyles,
  loadingWrapperStyles,
  wrapperErrorStyles,
  wrapperStyles,
} from './MediaFilePreviewCard.styles';

interface MediaFilePreviewCardProps {
  label: string;
  isLoading: boolean;
  isError: boolean;
  children: ReactNode;
}

export const MediaFilePreviewCard = ({label, isLoading, isError, children}: MediaFilePreviewCardProps) => {
  return (
    <article css={isError ? wrapperErrorStyles : wrapperStyles} aria-label={label}>
      {children}
      {isError && (
        <>
          <UnavailableFileIcon css={errorIconStyles} width={14} height={14} />
          <p css={errorTextStyles}>{t('cells.unavailableFile')}</p>
        </>
      )}
      {isLoading && !isError && (
        <div css={loadingWrapperStyles}>
          <div className="icon-spinner spin" css={loadingIconStyles} />
        </div>
      )}
    </article>
  );
};
