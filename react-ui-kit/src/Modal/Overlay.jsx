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

import {ANIMATION, DURATION, EASE} from '../Identity/motions';
import {COLOR} from '../Identity';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const OverlayWrapper = styled.div`
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

const OverlayContent = styled.div`
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

  @media (max-width: 767px) {
    width: 100%;
  }
`;

const OverlayBackground = styled.div`
  position: fixed;
  top: 0px;
  left: 0px;
  height: 100vh;
  width: 100vw;
  background: rgba(50, 54, 57, 0.4);
  z-index: 9998;
  animation: ${ANIMATION.fadeIn} ${DURATION.PROACTIVE_SLOW} ${EASE.QUART};
`;

const Overlay = ({children, ...props}) => (
  <OverlayWrapper {...props}>
    <OverlayContent>{children}</OverlayContent>
    <OverlayBackground data-uie-name="overlay-background" />
  </OverlayWrapper>
);

Overlay.propTypes = {
  children: PropTypes.node,
};

Overlay.defaultProps = {
  children: null,
};

export {Overlay, OverlayBackground, OverlayWrapper};
