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

import {ReactNode} from 'react';

import {InfoIcon} from 'Components/Icon';

import {ContainerStyle, ContentStyle, HeaderStyle} from './Note.styles';

interface NoteProps {
  title: string;
  children?: ReactNode;
}

const Note = ({title, children}: NoteProps) => {
  return (
    <div css={ContainerStyle}>
      <div css={HeaderStyle}>
        <InfoIcon />
        <span className="heading-h4">{title}</span>
      </div>

      <div css={ContentStyle}>
        <div>{children}</div>
      </div>
    </div>
  );
};

export {Note};
