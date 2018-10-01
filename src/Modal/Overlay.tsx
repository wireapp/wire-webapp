/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import * as React from 'react';
import styled from 'styled-components';
import {COLOR} from '../Identity';
import {ANIMATION, DURATION, EASE} from '../Identity/motions';
import {QUERY} from '../mediaQueries';

interface OverlayProps {}

const OverlayWrapper = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: fixed;
  display: flex;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  z-index: 9997;
  overflow-y: auto;
`;

const OverlayContent = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  max-width: 100%;
  overflow-y: auto;
  position: relative;
  justify-content: space-between;
  align-items: center;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  margin: auto;
  -webkit-transform: translate3d(0, 0, 0);

  * {
    color: ${COLOR.WHITE};
  }

  @media (${QUERY.tabletDown}) {
    width: 100%;
  }
`;

const OverlayBackground = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  position: fixed;
  top: 0px;
  left: 0px;
  height: 100vh;
  width: 100vw;
  background: rgba(0, 0, 0, 0.88);
  z-index: 9998;
  animation: ${ANIMATION.fadeIn} ${DURATION.PROACTIVE_SLOW}ms ${EASE.QUART};
`;

const Overlay = ({children = null, ...props}: OverlayProps & React.HTMLAttributes<HTMLDivElement>) => (
  <OverlayWrapper {...props} data-uie-name="modal">
    <OverlayContent>{children}</OverlayContent>
    <OverlayBackground data-uie-name="overlay-background" />
  </OverlayWrapper>
);

export {Overlay, OverlayBackground, OverlayWrapper};
