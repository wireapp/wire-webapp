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

import React from 'react';
import {QUERY} from '../mediaQueries';

interface MatchMediaProps extends React.HTMLProps<MatchMedia> {
  not?: boolean;
  query: string;
}

interface MatchMediaState {
  isMatching: boolean;
}

class MatchMedia extends React.PureComponent<MatchMediaProps, MatchMediaState> {
  static defaultProps = {
    not: false,
  };
  matchMedia: MediaQueryList;
  constructor(props: MatchMediaProps) {
    super(props);
    this.matchMedia = window.matchMedia(`(${props.query})`);
    this.state = {
      isMatching: this.matchMedia.matches,
    };
  }

  updateState = () => this.setState({isMatching: this.matchMedia.matches});

  componentDidMount() {
    this.matchMedia.addListener(this.updateState);
  }

  componentWillUnmount() {
    this.matchMedia.removeListener(this.updateState);
  }

  render() {
    const isMatching = this.props.not ? !this.state.isMatching : this.state.isMatching;
    return isMatching ? this.props.children : null;
  }
}

const IsDesktop = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.desktop} {...props} />;
const IsDesktopXL = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.desktopXL} {...props} />;
const IsMobile = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.mobile} {...props} />;
const IsMobileUp = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.mobileUp} {...props} />;
const IsTablet = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.tablet} {...props} />;
const IsTabletDown = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.tabletDown} {...props} />;
const IsTabletUp = (props: Partial<MatchMediaProps>) => <MatchMedia query={QUERY.tabletUp} {...props} />;

export {MatchMedia, IsDesktop, IsDesktopXL, IsMobile, IsMobileUp, IsTablet, IsTabletDown, IsTabletUp};
