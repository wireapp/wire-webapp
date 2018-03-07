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

import styled, {keyframes} from 'styled-components';
import {CloseIcon} from '../Icon';
import PropTypes from 'prop-types';
import React from 'react';

const ModalWrapper = styled.div`
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
  background-color: #fff;
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
`;

const backgroundFade = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const ModalBackground = styled.div`
  position: fixed;
  top: 0px;
  left: 0px;
  height: 100vh;
  width: 100vw;
  background: rgba(216, 216, 216, 0.4);
  z-index: 9998;
  animation: ${backgroundFade} 2s linear;
`;

const noop = () => {};

const Modal = ({children, fullscreen, onClose, onBackgroundClick}) => (
  <ModalWrapper>
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
  </ModalWrapper>
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
