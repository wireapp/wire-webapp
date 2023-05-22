/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FC} from 'react';

import {CSSObject} from '@emotion/react';

import {t} from 'Util/LocalizerUtil';

export interface DownloadButtonProps {
  actionId: string;
  messageFocusedTabIndex: number;
  onDownloadClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyPress: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  btnClass?: string;
  styles?: CSSObject;
}

const DownloadButton: FC<DownloadButtonProps> = ({
  actionId,
  messageFocusedTabIndex,
  onDownloadClick,
  onKeyPress,
  children,
  btnClass = '',
  styles = {},
}) => {
  return (
    <button
      css={styles}
      type="button"
      tabIndex={messageFocusedTabIndex}
      data-uie-name={actionId}
      aria-label={t('conversationContextMenuDownload')}
      onClick={onDownloadClick}
      className={btnClass}
    >
      {children}
    </button>
  );
};

export {DownloadButton};
