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

import * as Color from 'color';
import * as React from 'react';
import styled from 'styled-components';
import {COLOR, Opacity, Slide, YAxisMovement} from '../Identity';
import {DURATION, defaultTransition} from '../Identity/motions';
import {Content} from '../Layout';
import {QUERY} from '../mediaQueries';
import {Link, Text} from '../Text';

const MenuWrapper = styled.div`
  height: 64px;
`;

interface MenuProps {
  open?: boolean;
}

type HTMLMenuProps = MenuProps & React.HTMLAttributes<HTMLDivElement>;

const MenuContent = styled(Content)<HTMLMenuProps>`
  height: 64px;
  align-items: center;
  justify-content: space-between;
  flex-direction: row;
  ${props =>
    props.open &&
    `
    position: fixed;
    width: 100%;
    z-index: 10000;
    left: 0;
  `};
`;

const MenuItems = styled.div<HTMLMenuProps>`
  @media (${QUERY.tabletDown}){
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: ${COLOR.WHITE};
    z-index: 1;
    transform: translateX(110%);
    transition: transform 0.25s ease;
    ${props => props.open && `transform: translateX(0);`}
`;

const ScrollableItems = styled.div<HTMLMenuProps>`
  @media (${QUERY.tabletDown}){
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow-y: auto;
    height: 100%;
`;

const MenuOpenButton = styled.div<HTMLMenuProps>`
  @media (${QUERY.desktop}) {
    display: none;
  }

  display: block;
  z-index: 2;

  div {
    width: 16px;
    height: 2px;
    background-color: ${COLOR.TEXT};
    margin: 4px;
    transition: all 0.25s ease-in-out;
  }

  ${props =>
    props.open &&
    `
    div:nth-child(1) {
      transform: translateY(6px) rotate(-45deg);
    }

    div:nth-child(2) {
        opacity: 0;
        transform: scale(0, 1);
    }

    div:nth-child(3) {
        transform: translateY(-6px) rotate(45deg);
    }
  `};
`;

const MenuLogo = styled.div<React.HTMLAttributes<HTMLDivElement>>`
  z-index: 2;
`;

interface MenuLinkProps {
  button?: boolean;
}

const MenuLink = styled(Text)<MenuLinkProps & React.HTMLAttributes<HTMLAnchorElement>>`
  text-decoration: none;
  ${defaultTransition};
  cursor: pointer;
  color: ${COLOR.LINK};

  &:hover {
    color: ${Color(COLOR.LINK)
      .mix(Color(COLOR.BLACK), 0.16)
      .toString()};
  }
  @media (${QUERY.desktop}) {
    margin: 12px 26px 0 10px;
    text-transform: uppercase;
    font-size: 11px;
    &:first-child {
      margin-left: 0;
    }

    &:last-child {
      margin-right: 0;
    }
  }

  ${props =>
    props.button &&
    `
  padding: 10px 16px;
  border: 1px solid rgb(219, 226, 231);
  border-radius: 4px;
  `}

  @media (${QUERY.tabletDown}) {
    border: none;
    font-size: 32px !important;
    text-transform: none !important;
    font-weight: 300 !important;
    padding: 8px 24px;
    max-width: 480px;
  }
`;

const DesktopStyledHeaderSubMenu = styled.span<React.HTMLAttributes<HTMLSpanElement>>`
  display: flex;
  flex-direction: column;
  justify-content: center;

  min-width: 200px;
  align-items: left;
  background-color: white;
  box-shadow: 0 8px 24px 0 rgba(0, 0, 0, 0.16);
  border-radius: 8px;
  padding: 8px 8px;
  span {
    margin: 0px;
    padding-left: 10px !important;
    padding-right: 10px !important;
    height: 30px;
    display: flex;
    align-items: center;
    white-space: nowrap;
    &:hover {
      background-color: ${COLOR.GRAY_LIGHTEN_72};
      border-radius: 4px;
    }
  }
`;

const MobileStyledHeaderSubMenu = styled.span<React.HTMLAttributes<HTMLSpanElement>>`
  display: flex;
  flex-direction: column;
  justify-content: center;

  align-items: center;
  border-top: 1px solid ${COLOR.GRAY_LIGHTEN_72};
  margin-top: 16px;
  padding-top: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  * {
    font-weight: 200 !important;
  }
`;

interface HeaderSubMenuProps {
  caption: string;
  isOpen: boolean;
}

const HeaderSubMenu: React.SFC<HeaderSubMenuProps & React.HTMLAttributes<HTMLSpanElement>> = ({
  caption,
  isOpen,
  children,
  ...props
}) => {
  const isDesktop = typeof window !== 'undefined' && window.matchMedia(`(${QUERY.desktop})`).matches;
  return (
    <MenuLink
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
          startValue={'-58%'}
          endValue={'0'}
          timeout={DURATION.DEFAULT}
          mountOnEnter={false}
          unmountOnExit={true}
        >
          <MobileStyledHeaderSubMenu>{children}</MobileStyledHeaderSubMenu>
        </Slide>
      </Opacity>
    </MenuLink>
  );
};

interface HeaderMenuProps {
  logoElement?: React.ReactNode;
}

interface HeaderMenuState {
  isOpen?: boolean;
}

class HeaderMenu extends React.PureComponent<HeaderMenuProps & React.HTMLAttributes<HTMLDivElement>, HeaderMenuState> {
  static defaultProps: HeaderMenuProps = {
    logoElement: null,
  };

  state = {
    isOpen: false,
  };

  toggleMenu = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      this.setState(({isOpen}) => ({isOpen: !isOpen}));
    }
  };

  closeMenu = () => {
    this.setState({isOpen: false});
  };

  render() {
    const {isOpen} = this.state;
    const {children, logoElement = null, ...props} = this.props;
    return (
      <MenuWrapper {...props} data-uie-name="element-header-menu">
        <MenuContent open={isOpen}>
          <MenuLogo onClick={this.closeMenu}>{logoElement}</MenuLogo>
          <MenuItems onClick={this.closeMenu} open={isOpen}>
            <ScrollableItems>{children}</ScrollableItems>
          </MenuItems>
          <MenuOpenButton onClick={this.toggleMenu} open={isOpen} data-uie-name="do-toggle-header-menu">
            <div />
            <div />
            <div />
          </MenuOpenButton>
        </MenuContent>
      </MenuWrapper>
    );
  }
}

MenuLink.defaultProps = {
  ...Link.defaultProps,
  button: false,
};

export {HeaderMenu, MenuLink, HeaderSubMenu};
