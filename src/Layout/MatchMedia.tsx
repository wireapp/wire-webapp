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
import {defaultProps} from 'recompose';
import {QUERY} from '../mediaQueries';

interface MatchMediaProps {
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

const IsDesktop = defaultProps<MatchMediaProps>({query: QUERY.desktop})(MatchMedia);
const IsDesktopXL = defaultProps<MatchMediaProps>({query: QUERY.desktopXL})(MatchMedia);
const IsMobile = defaultProps<MatchMediaProps>({query: QUERY.mobile})(MatchMedia);
const IsMobileUp = defaultProps<MatchMediaProps>({query: QUERY.mobileUp})(MatchMedia);
const IsTablet = defaultProps<MatchMediaProps>({query: QUERY.tablet})(MatchMedia);
const IsTabletDown = defaultProps<MatchMediaProps>({query: QUERY.tabletDown})(MatchMedia);
const IsTabletUp = defaultProps<MatchMediaProps>({query: QUERY.tabletUp})(MatchMedia);

export {MatchMedia, IsDesktop, IsDesktopXL, IsMobile, IsMobileUp, IsTablet, IsTabletDown, IsTabletUp};
