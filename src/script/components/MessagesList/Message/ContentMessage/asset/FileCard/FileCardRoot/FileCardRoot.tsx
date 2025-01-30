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

import {wrapperStyles, contentStyles} from './FileCardRoot.styles';

import {FileCardContextProvider} from '../common/FileCardContext/FileCardContext';
import {FileCardStatus} from '../FileCardStatus/FileCardStatus';

interface FileCardRootProps {
  status?: 'error' | 'loading';
  children: ReactNode;
}

const FileCardRoot = memo(({children, status}: FileCardRootProps) => {
  return (
    <article css={wrapperStyles}>
      <div css={contentStyles}>{children}</div>
      <FileCardStatus status={status} />
    </article>
  );
});

FileCardRoot.displayName = 'FileCardRoot';

interface FileCardRootWithContextProps {
  variant: 'preview' | 'message';
  status?: 'error' | 'loading';
  extension: string;
  name: string;
  size: string;
  children: ReactNode;
}

const FileCardRootWithContext = ({children, variant, extension, name, size, status}: FileCardRootWithContextProps) => {
  const value = useMemo(() => ({variant, extension, name, size}), [extension, name, size, variant]);

  return (
    <FileCardContextProvider value={value}>
      <FileCardRoot status={status}>{children}</FileCardRoot>
    </FileCardContextProvider>
  );
};

export {FileCardRootWithContext as FileCardRoot};
