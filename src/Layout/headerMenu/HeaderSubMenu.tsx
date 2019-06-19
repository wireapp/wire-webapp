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
import {COLOR, Opacity, Slide, YAxisMovement} from '../../Identity';
import {DURATION} from '../../Identity/motions';
import {QUERY} from '../../mediaQueries';
import {MenuSubLink} from './MenuSubLink';

export type DesktopStyledHeaderSubMenuProps<T = HTMLDivElement> = React.HTMLProps<T>;

const desktopStyledHeaderSubMenuStyle: (
  props: DesktopStyledHeaderSubMenuProps
) => ObjectInterpolation<undefined> = props => ({
  alignItems: 'left',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 8px 24px 0 rgba(0, 0, 0, 0.16)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  minWidth: '200px',
  padding: '8px 8px',
  span: {
    '&:hover': {
      backgroundColor: COLOR.GRAY_LIGHTEN_72,
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
});

export const DESKTOP_HEADER_SUB_MENU_CLASSNAME = 'desktopStyledHeaderSubMenu';

export const DesktopStyledHeaderSubMenu = (props: DesktopStyledHeaderSubMenuProps) => (
  <div className={DESKTOP_HEADER_SUB_MENU_CLASSNAME} css={desktopStyledHeaderSubMenuStyle(props)} {...props} />
);

export interface MobileStyledHeaderSubMenuProps<T = HTMLSpanElement> extends React.HTMLProps<T> {
  open?: boolean;
}

const mobileStyledHeaderSubMenuStyle: (
  props: MobileStyledHeaderSubMenuProps
) => ObjectInterpolation<undefined> = props => ({
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

export interface HeaderSubMenuProps<T = HTMLParagraphElement> extends React.HTMLProps<T> {
  caption: string;
  isOpen: boolean;
}

export const HeaderSubMenu: React.SFC<HeaderSubMenuProps> = ({caption, isOpen, children, ...props}) => {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia(`(${QUERY.desktop})`).matches;
  return (
    <MenuSubLink
      {...props}
      style={{textAlign: 'center', display: 'inline-block', position: 'relative', cursor: 'pointer'}}
    >
      <span>{caption}</span>
      <Opacity
        in={isOpen && isDesktop}
        timeout={DURATION.DEFAULT}
        style={{display: 'inline-block', position: 'absolute', left: -18, zIndex: 1, paddingTop: 20, marginTop: 10}}
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
        style={{position: 'relative', display: 'block'}}
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
