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

import {ReactNode, memo, useMemo} from 'react';

import {contentStyles, wrapperStylesLarge, wrapperStylesSmall} from './FileCardRoot.styles';

import {FileCardContextProvider} from '../common/FileCardContext/FileCardContext';

interface FileCardOptions {
  /**
   * Size of the file card
   * @default 'small'
   */
  variant?: 'small' | 'large';
  /** File extension
   * @example 'pdf', 'doc', 'jpg', 'png', 'mp4'
   */
  extension: string;
  /** Name of the file without extension */
  name: string;
  /** Formatted file size
   * @example '1.2 MB'
   */
  size?: string;
}

interface FileCardRootProps extends Pick<FileCardOptions, 'variant'> {
  children: ReactNode;
}

const FileCardRoot = memo(({children, variant}: FileCardRootProps) => {
  return (
    <article css={variant === 'small' ? wrapperStylesSmall : wrapperStylesLarge}>
      <div css={contentStyles}>{children}</div>
    </article>
  );
});

FileCardRoot.displayName = 'FileCardRoot';

interface FileCardRootWithContextProps extends FileCardOptions {
  children: ReactNode;
}

const FileCardRootWithContext = ({
  children,
  variant = 'small',
  extension,
  name,
  size,
}: FileCardRootWithContextProps) => {
  const value = useMemo(() => ({variant, extension, name, size}), [extension, name, size, variant]);

  return (
    <FileCardContextProvider value={value}>
      <FileCardRoot variant={variant}>{children}</FileCardRoot>
    </FileCardContextProvider>
  );
};

export {FileCardRootWithContext as FileCardRoot};
