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
import {OverlayBackground, OverlayWrapper} from '../Modal/Overlay';
import {COLOR} from '../Identity/';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const MenuModalWrapper = styled(OverlayWrapper)`
  padding: 0;
`;

const MenuModalBody = styled.div`
  position: relative;
  box-shadow: 0 16px 64px 0 rgba(0, 0, 0, 0.16);
  justify-content: space-between;
  align-items: flex-end;
  align-self: flex-end;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  padding: 8px 16px;
  z-index: 9999;
  margin-left: auto;
  margin-right: auto;
  width: 767px;
  animation: ${ANIMATION.bottomUpMovement} ${DURATION.DEFAULT} ${EASE.EXPONENTIAL};
  @media (max-width: 767px) {
    width: 100%;
  }
`;

const MenuModalContent = styled.ul`
  min-width: 100%;
  max-width: 100%;
  padding: 0;
  margin: 0;
  li {
    border-bottom: 1px solid ${COLOR.GRAY_LIGHTEN_72};
  }
  li:last-child {
    border-bottom: 0;
  }
`;

const MenuItemContent = styled.li`
  color: ${COLOR.TEXT};
  display: flex;
  align-items: center;
  max-width: 100%;
  cursor: pointer;
  height: 56px;
  list-style-type: none;
`;

const MenuModalBackground = styled(OverlayBackground)`
  background: rgba(50, 54, 57, 0.4);
`;

const noop = () => {};

const MenuModal = ({children, onBackgroundClick, ...props}) => (
  <MenuModalWrapper {...props}>
    <MenuModalBody>
      <MenuModalContent>{children}</MenuModalContent>
    </MenuModalBody>
    <MenuModalBackground onClick={onBackgroundClick} data-uie-name="menu-background" />
  </MenuModalWrapper>
);

const MenuItem = ({children, ...props}) => <MenuItemContent {...props}>{children}</MenuItemContent>;

MenuItem.propTypes = {
  children: PropTypes.node,
  onClick: PropTypes.func,
};

MenuItem.defaultProps = {
  children: null,
  onClick: noop,
};

MenuModal.propTypes = {
  children: PropTypes.node,
  onBackgroundClick: PropTypes.func,
};

MenuModal.defaultProps = {
  children: null,
  onBackgroundClick: noop,
};

export {MenuModal, MenuItem};
