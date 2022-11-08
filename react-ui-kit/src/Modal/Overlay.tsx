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

import {COLOR} from '../Identity';
import {ANIMATION, DURATION, EASE} from '../Identity/motions';
import {QueryKeys, media} from '../mediaQueries';
import {noop} from '../util';

export type OverlayWrapperProps<T = HTMLDivElement> = React.HTMLProps<T>;

export const overlayWrapperStyle: <T>(props: OverlayWrapperProps<T>) => CSSObject = () => ({
  bottom: 0,
  display: 'flex',
  left: 0,
  overflowY: 'auto',
  padding: '24px',
  position: 'fixed',
  right: 0,
  top: 0,
  zIndex: 9997,
});

export const OverlayWrapper = (props: OverlayWrapperProps) => <div css={overlayWrapperStyle} {...props} />;

export const OverlayContent = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={{
      '*': {
        color: COLOR.WHITE,
      },
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      margin: 'auto',
      maxWidth: '100%',
      overflowY: 'auto',
      position: 'relative',
      transform: 'translate3d(0, 0, 0)',
      zIndex: 9999,
      [media[QueryKeys.TABLET_DOWN]]: {
        width: '100%',
      },
    }}
    {...props}
  />
);

export type OverlayBackgroundProps<T = HTMLDivElement> = React.HTMLProps<T>;

export const overlayBackgroundStyle: <T>(props: OverlayBackgroundProps<T>) => CSSObject = () => ({
  animation: `${ANIMATION.fadeIn} ${DURATION.PROACTIVE_SLOW}ms ${EASE.QUART}`,
  background: 'rgba(0, 0, 0, 0.88)',
  height: '100vh',
  left: 0,
  position: 'fixed',
  top: 0,
  width: '100vw',
  zIndex: 9998,
});

export const OverlayBackground = (props: OverlayBackgroundProps) => <div css={overlayBackgroundStyle} {...props} />;

export interface OverlayProps<T = HTMLDivElement> extends React.HTMLProps<T> {
  onBackgroundClick?: () => void;
}

export const Overlay = ({onBackgroundClick = noop, children = null, ...props}: OverlayProps) => (
  <OverlayWrapper {...props} data-uie-name="modal">
    <OverlayContent>{children}</OverlayContent>
    <OverlayBackground onClick={onBackgroundClick} data-uie-name="overlay-background" />
  </OverlayWrapper>
);
