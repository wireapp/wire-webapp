/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React from 'react';

import {css} from '@emotion/react';

const scrollStyles = css`
  overflow: hidden;
  width: 100%;
  &:hover {
    animation: animate-scroll 7s linear infinite;
  }

  @keyframes animate-scroll {
    0% {
      text-indent: 0;
    }
    80% {
      text-indent: var(--overflow-width);
    }
    100% {
      text-indent: var(--overflow-width);
    }
`;

interface AutoscrollingContainerProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
}

export const AutoscrollingContainer = ({children, ...props}: AutoscrollingContainerProps) => {
  const computeContentSize = (element: HTMLDivElement | null) => {
    if (!element) {
      return;
    }
    const overflow = element.scrollWidth - element.clientWidth;
    element.style.setProperty('--overflow-width', `-${overflow}px`);
  };

  return (
    <div {...props} css={scrollStyles} ref={computeContentSize}>
      {children}
    </div>
  );
};
