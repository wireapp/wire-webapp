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
import {CSSObject, jsx} from '@emotion/react';
import React, {CSSProperties} from 'react';
import Color from 'color';

import {CloseIcon} from '../Icon';
import {SVGIconProps} from '../Icon/SVGIcon';
import {COLOR} from '../Identity';
import {Theme} from '../Layout';
import {QueryKeys, media} from '../mediaQueries';
import {filterProps, noop} from '../util';
import {OverlayBackgroundProps, OverlayWrapper, overlayBackgroundStyle} from './Overlay';

export interface ModalBodyProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  fullscreen?: boolean;
}

const modalBodyStyle: <T>(theme: Theme, props: ModalBodyProps<T>) => CSSObject = (theme, {fullscreen = false}) => ({
  alignItems: 'center',
  backgroundColor: theme.general.backgroundColor,
  borderRadius: fullscreen ? 0 : '8px',
  bottom: fullscreen ? 0 : undefined,
  boxShadow: fullscreen ? 'none' : '0 16px 64px 0 rgba(0, 0, 0, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: fullscreen ? 'center' : 'space-between',
  left: fullscreen ? 0 : undefined,
  margin: 'auto',
  position: fullscreen ? 'fixed' : 'relative',
  right: fullscreen ? 0 : undefined,
  top: fullscreen ? 0 : undefined,
  transform: 'translate3d(0, 0, 0)',
  zIndex: 9999,
  [media[QueryKeys.TABLET_DOWN]]: {
    width: fullscreen ? 'initial' : '100%',
  },
});

const filterModalBodyProps = (props: ModalBodyProps) => filterProps(props, ['fullscreen']);

const ModalBody = (props: ModalBodyProps) => (
  <div css={(theme: Theme) => modalBodyStyle(theme, props)} {...filterModalBodyProps(props)} />
);

const ModalClose = (props: SVGIconProps<SVGSVGElement>) => (
  <CloseIcon
    width={16}
    height={16}
    css={{
      alignItems: 'center',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      position: 'absolute',
      right: 16,
      top: 16,
    }}
    {...props}
  />
);

const ModalContent: React.FC<React.HTMLProps<HTMLDivElement>> = props => (
  <div
    css={{
      maxWidth: '100%',
      overflowY: 'auto',
      padding: '40px',
    }}
    {...props}
  />
);

const modalBackgroundStyle: <T>(props: OverlayBackgroundProps<T>) => CSSObject = props => ({
  ...overlayBackgroundStyle(props),
  backgroundColor: 'rgba(50, 54, 57, 0.4)',
});

const ModalBackground = (props: OverlayBackgroundProps) => <div css={modalBackgroundStyle(props)} {...props} />;

export interface ModalActionItem {
  bold?: boolean;
  dataUieName?: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  title: string;
}

interface ModalActions {
  actions?: ModalActionItem[];
}

const modalActionsWrapperStyles: () => CSSObject = () => ({
  borderTop: `1px solid ${COLOR.GRAY_LIGHTEN_72}`,
  bottom: 0,
  display: 'flex',
  div: {
    '&:hover': {
      backgroundColor: COLOR.opaque(COLOR.GRAY_DARKEN_72, 0.04),
    },
    '&:active': {
      backgroundColor: COLOR.opaque(COLOR.GRAY_DARKEN_72, 0.08),
    },
    borderRight: `1px solid ${COLOR.GRAY_LIGHTEN_72}`,
  },
  'div:first-child': {
    borderBottomLeftRadius: 8,
  },
  'div:last-child': {
    borderBottomRightRadius: 8,
    borderRight: 0,
  },
  position: 'absolute',
  width: '100%',
});

const modalActionStyles: ({bold}: {bold: boolean}) => CSSObject = ({bold}) => ({
  '&:hover': {
    color: Color(COLOR.BLUE).mix(Color(COLOR.BLACK), 0.16).toString(),
  },
  color: COLOR.BLUE,
  cursor: 'pointer',
  display: 'flex',
  flex: 1,
  fontWeight: bold ? 'bold' : 'normal',
  justifyContent: 'center',
  padding: '8px 0',
});

const ModalActions: React.FC<ModalActions> = ({actions}) => (
  <div css={modalActionsWrapperStyles()}>
    {actions.map(action => (
      <div
        key={action.title}
        onClick={action.onClick}
        css={modalActionStyles({bold: action.bold})}
        data-uie-name={action.dataUieName}
      >
        {action.title}
      </div>
    ))}
  </div>
);

interface ModalProps {
  actions?: ModalActionItem[];
  bodyStyle?: CSSProperties;
  fullscreen?: boolean;
  onBackgroundClick?: () => void;
  onClose?: () => void;
}

export const Modal: React.FC<ModalProps & React.HTMLProps<HTMLDivElement>> = ({
  actions = [],
  children,
  bodyStyle,
  fullscreen,
  onClose,
  onBackgroundClick,
  ...props
}) => (
  <OverlayWrapper {...props} data-uie-name="modal">
    <ModalBody fullscreen={fullscreen} style={bodyStyle}>
      <ModalContent>{children}</ModalContent>
      {onClose !== noop && <ModalClose onClick={onClose} data-uie-name="do-close" />}
      {actions.length > 0 && <ModalActions actions={actions} data-uie-name="modal-actions" />}
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
  actions: [],
  fullscreen: false,
  onBackgroundClick: noop,
  onClose: noop,
};
