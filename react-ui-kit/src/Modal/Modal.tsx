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

/** @jsx jsx */
import {ObjectInterpolation, jsx} from '@emotion/core';
import React from 'react';
import {CloseIcon} from '../Icon';
import {SVGIconProps} from '../Icon/SVGIcon';
import {COLOR} from '../Identity';
import {QueryKeys, media} from '../mediaQueries';
import {filterProps, noop} from '../util';
import {OverlayBackgroundProps, OverlayWrapper, overlayBackgroundStyle} from './Overlay';

export interface ModalBodyProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  fullscreen?: boolean;
}

const modalBodyStyle: <T>(props: ModalBodyProps<T>) => ObjectInterpolation<undefined> = props => ({
  alignItems: 'center',
  backgroundColor: COLOR.GRAY_LIGHTEN_88,
  borderRadius: props.fullscreen ? 0 : '8px',
  bottom: props.fullscreen ? 0 : undefined,
  boxShadow: props.fullscreen ? 'none' : '0 16px 64px 0 rgba(0, 0, 0, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: props.fullscreen ? 'center' : 'space-between',
  left: props.fullscreen ? 0 : undefined,
  margin: 'auto',
  position: props.fullscreen ? 'fixed' : 'relative',
  right: props.fullscreen ? 0 : undefined,
  top: props.fullscreen ? 0 : undefined,
  transform: 'translate3d(0, 0, 0)',
  zIndex: 9999,
  [media[QueryKeys.TABLET_DOWN]]: {
    width: props.fullscreen ? 'initial' : '100%',
  },
});

const filterModalBodyProps = (props: Object) => filterProps(props, ['fullscreen']);

const ModalBody = (props: ModalBodyProps) => <div css={modalBodyStyle(props)} {...filterModalBodyProps(props)} />;

const ModalClose = (props: SVGIconProps<SVGSVGElement>) => (
  <CloseIcon
    css={{
      alignItems: 'center',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      marginRight: '10px',
      marginTop: '10px',
      position: 'absolute',
      right: '10px',
      top: '10px',
    }}
    {...props}
  />
);

const ModalContent = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={{
      maxWidth: '100%',
      overflowY: 'auto',
      padding: '40px',
    }}
    {...props}
  />
);

const modalBackgroundStyle: <T>(props: OverlayBackgroundProps<T>) => ObjectInterpolation<undefined> = props => ({
  ...overlayBackgroundStyle(props),
  backgroundColor: 'rgba(50, 54, 57, 0.4)',
});

const ModalBackground = (props: OverlayBackgroundProps) => <div css={modalBackgroundStyle(props)} {...props} />;

interface ModalProps {
  fullscreen?: boolean;
  onBackgroundClick?: () => void;
  onClose?: () => void;
}

export const Modal: React.SFC<ModalProps & React.HTMLProps<HTMLDivElement>> = ({
  children,
  fullscreen,
  onClose,
  onBackgroundClick,
  ...props
}) => (
  <OverlayWrapper {...props} data-uie-name="modal">
    <ModalBody fullscreen={fullscreen}>
      <ModalContent>{children}</ModalContent>
      {onClose !== noop && <ModalClose onClick={onClose} data-uie-name="do-close" />}
    </ModalBody>
    {!fullscreen && (
      <ModalBackground
        onClick={onBackgroundClick === noop ? onClose : onBackgroundClick}
        data-uie-name="modal-background"
      />
    )}
  </OverlayWrapper>
);

Modal.defaultProps = {
  fullscreen: false,
  onBackgroundClick: noop,
  onClose: noop,
};
