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

import {CSSObject} from '@emotion/react';

import {COLOR} from '../Identity/';
import {ANIMATION, DURATION, EASE} from '../Identity/motions';
import {Theme} from '../Layout';
import {QueryKeys, media} from '../mediaQueries';
import {OverlayBackgroundProps, OverlayWrapperProps, overlayBackgroundStyle} from '../Modal/Overlay';
import {noop} from '../util';

const menuModalWrapperStyle: <T>(props: OverlayWrapperProps<T>) => CSSObject = props => ({
  ...overlayBackgroundStyle(props),
  alignItems: 'flex-end',
  alignSelf: 'flex-end',
  display: 'flex',
  overflowY: 'hidden',
  padding: 0,
});

const MenuModalWrapper = (props: OverlayWrapperProps) => <div css={menuModalWrapperStyle} {...props} />;

const MenuModalBody = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={(theme: Theme) => ({
      animation: `${ANIMATION.bottomUpMovement} ${DURATION.DEFAULT}ms ${EASE.EXPONENTIAL}`,
      backgroundColor: COLOR.tint(theme.general.backgroundColor, 0.16),
      boxShadow: '0 16px 64px 0 rgba(0, 0, 0, 0.16)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      marginLeft: 'auto',
      marginRight: 'auto',
      padding: '8px 16px',
      position: 'relative',
      width: '767px',
      zIndex: 9999,
      [media[QueryKeys.TABLET_DOWN]]: {
        width: '100%',
      },
    })}
    {...props}
  />
);

const MenuModalContent = (props: React.HTMLProps<HTMLUListElement>) => (
  <ul
    css={{
      li: {
        borderBottom: `1px solid ${COLOR.GRAY_LIGHTEN_72}`,
      },
      'li:last-child': {
        borderBottom: 0,
      },
      margin: 0,
      maxWidth: '100%',
      minWidth: '100%',
      padding: 0,
    }}
    {...props}
  />
);

const modalBackgroundStyle: <T>(props: OverlayBackgroundProps<T>) => CSSObject = props => ({
  ...overlayBackgroundStyle(props),
  background: 'rgba(50, 54, 57, 0.4)',
});

const MenuModalBackground = (props: OverlayBackgroundProps) => <div css={modalBackgroundStyle} {...props} />;

interface MenuModalProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  onBackgroundClick?: () => void;
}

export const MenuModal = ({
  children = null,
  onBackgroundClick = noop,
  ...props
}: MenuModalProps & React.HTMLProps<HTMLDivElement>) => (
  <MenuModalWrapper {...props}>
    <MenuModalBody>
      <MenuModalContent>{children}</MenuModalContent>
    </MenuModalBody>
    <MenuModalBackground onClick={onBackgroundClick} data-uie-name="menu-background" />
  </MenuModalWrapper>
);

export type MenuItemProps<T = HTMLLIElement> = React.HTMLProps<T>;

export const MenuItem = ({children = null, ...props}: MenuItemProps & React.HTMLProps<HTMLLIElement>) => (
  <li
    css={(theme: Theme) => ({
      alignItems: 'center',
      color: theme.general.color,
      cursor: 'pointer',
      display: 'flex',
      height: '56px',
      listStyleType: 'none',
      maxWidth: '100%',
    })}
    {...props}
  >
    {children}
  </li>
);
