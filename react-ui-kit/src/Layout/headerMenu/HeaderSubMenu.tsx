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

import {MENU_LINK_CLASSNAME} from './MenuLink';
import {MenuSubLink} from './MenuSubLink';

import {COLOR, Opacity, Slide, YAxisMovement} from '../../Identity';
import {DURATION} from '../../Identity/motions';
import {QUERY} from '../../mediaQueries';
import {Theme} from '../../Theme/Theme';

export type DesktopStyledHeaderSubMenuProps<T = HTMLDivElement> = React.HTMLProps<T>;

const desktopStyledHeaderSubMenuStyle: (theme: Theme, props: DesktopStyledHeaderSubMenuProps) => CSSObject = theme => ({
  alignItems: 'left',
  backgroundColor: COLOR.tint(theme.general.backgroundColor, 0.16),
  borderRadius: '8px',
  boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: '200px',
  padding: '8px 8px',
  span: {
    '&:hover': {
      backgroundColor: theme.general.backgroundColor,
      borderRadius: '4px',
    },
    alignItems: 'center',
    display: 'flex',
    height: '30px',
    margin: 0,
    paddingLeft: '10px !important',
    paddingRight: '10px !important',
    whiteSpace: 'nowrap',
  },
  [`.${MENU_LINK_CLASSNAME}:nth-of-type(n+2)`]: {
    marginTop: '8px',
  },
});

export const DESKTOP_HEADER_SUB_MENU_CLASSNAME = 'desktopStyledHeaderSubMenu';

export const DesktopStyledHeaderSubMenu = (props: DesktopStyledHeaderSubMenuProps) => (
  <div
    className={DESKTOP_HEADER_SUB_MENU_CLASSNAME}
    css={(theme: Theme) => desktopStyledHeaderSubMenuStyle(theme, props)}
    {...props}
  />
);

export interface MobileStyledHeaderSubMenuProps<T = HTMLSpanElement> extends React.HTMLProps<T> {
  open?: boolean;
}

const mobileStyledHeaderSubMenuStyle: (props: MobileStyledHeaderSubMenuProps) => CSSObject = _ => ({
  '*': {
    fontWeight: 200,
  },
  alignItems: 'center',
  borderTop: `1px solid ${COLOR.GRAY_LIGHTEN_72}`,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  marginTop: '16px',
  paddingTop: '8px',
});

export const MobileStyledHeaderSubMenu = (props: MobileStyledHeaderSubMenuProps) => (
  <span css={mobileStyledHeaderSubMenuStyle(props)} {...props} />
);

export interface HeaderSubMenuProps<T = HTMLParagraphElement> extends React.PropsWithRef<React.HTMLProps<T>> {
  caption: string;
  isOpen: boolean;
}

export const HeaderSubMenu: React.FC<HeaderSubMenuProps> = ({caption, isOpen, children, ...props}) => {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia(`(${QUERY.desktop})`).matches;
  return (
    <MenuSubLink
      {...props}
      style={{cursor: 'pointer', display: 'inline-block', position: 'relative', textAlign: 'center'}}
    >
      <span>{caption}</span>
      <Opacity
        in={isOpen && isDesktop}
        timeout={DURATION.DEFAULT}
        style={{display: 'inline-block', left: -18, marginTop: 10, paddingTop: 20, position: 'absolute', zIndex: 1}}
        mountOnEnter={false}
        unmountOnExit={false}
      >
        <YAxisMovement
          in={isOpen && isDesktop}
          startValue={'-30px'}
          endValue={'0px'}
          style={{display: 'inline-block'}}
          timeout={DURATION.DEFAULT}
          mountOnEnter={false}
          unmountOnExit={true}
        >
          <DesktopStyledHeaderSubMenu>{children}</DesktopStyledHeaderSubMenu>
        </YAxisMovement>
      </Opacity>
      <Opacity
        in={isOpen && !isDesktop}
        timeout={DURATION.DEFAULT}
        mountOnEnter={false}
        unmountOnExit={false}
        style={{display: 'block', position: 'relative'}}
      >
        <Slide
          in={isOpen && !isDesktop}
          startValue={'-56%'}
          endValue={'0'}
          timeout={DURATION.DEFAULT}
          mountOnEnter={false}
          unmountOnExit={true}
        >
          <MobileStyledHeaderSubMenu>{children}</MobileStyledHeaderSubMenu>
        </Slide>
      </Opacity>
    </MenuSubLink>
  );
};
