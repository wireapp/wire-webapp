/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ButtonHTMLAttributes, ReactElement, ReactEventHandler} from 'react';

import {imageStyles, wrapperStyles} from './fileCardPreview.styles';

interface FileCardPreviewProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  src?: string;
  imageVisible?: boolean;
  onImageLoad?: ReactEventHandler<HTMLImageElement>;
  onImageError?: ReactEventHandler<HTMLImageElement>;
}

export const FileCardPreview = ({
  src,
  imageVisible = true,
  onImageLoad,
  onImageError,
  children,
  type = 'button',
  ...buttonProps
}: FileCardPreviewProps): ReactElement => {
  return (
    <button type={type} css={wrapperStyles} {...buttonProps}>
      <img
        src={src}
        alt=""
        style={{opacity: imageVisible ? 1 : 0}}
        css={imageStyles}
        onLoad={onImageLoad}
        onError={onImageError}
      />
      {children}
    </button>
  );
};
