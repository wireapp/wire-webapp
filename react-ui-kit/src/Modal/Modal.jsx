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

import {OverlayBackground, OverlayWrapper} from './Overlay';
import {COLOR} from '../Identity';
import {CloseIcon} from '../Icon';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const ModalBody = styled.div`
  ${props =>
    props.fullscreen
      ? `
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      border-radius: 0;
      justify-content: center;
      box-shadow: none;
      @media (max-width: 767px) {
        width: initial;
      }
      `
      : `
      position: relative;
      border-radius: 8px;
      box-shadow: 0 16px 64px 0 rgba(0, 0, 0, 0.16);
      justify-content: space-between;
      @media (max-width: 767px) {
        width: 100%;
      }
      `};
  align-items: center;
  background-color: ${COLOR.GRAY_LIGHTEN_88};
  display: flex;
  flex-direction: column;
  padding: 12px 24px;
  z-index: 9999;
  margin: auto;
  -webkit-transform: translate3d(0, 0, 0);
`;

const ModalClose = styled(CloseIcon)`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 13px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  cursor: pointer;
`;

const ModalContent = styled.div`
  max-width: 100%;
  overflow-y: auto;
  padding: 40px;
`;

const ModalBackground = styled(OverlayBackground)`
  background: rgba(50, 54, 57, 0.4);
`;

const noop = () => {};

const Modal = ({children, fullscreen, onClose, onBackgroundClick, ...props}) => (
  <OverlayWrapper {...props}>
    <ModalBody fullscreen={fullscreen}>
      <ModalContent>{children}</ModalContent>
      {onClose !== noop && <ModalClose onClick={onClose} data-uie-name="modal-close" />}
    </ModalBody>
    {!fullscreen && (
      <ModalBackground
        onClick={onBackgroundClick === noop ? onClose : onBackgroundClick}
        data-uie-name="modal-background"
      />
    )}
  </OverlayWrapper>
);

Modal.propTypes = {
  children: PropTypes.node,
  fullscreen: PropTypes.bool,
  onBackgroundClick: PropTypes.func,
  onClose: PropTypes.func,
};

Modal.defaultProps = {
  children: null,
  fullscreen: false,
  onBackgroundClick: noop,
  onClose: noop,
};

export {Modal};
