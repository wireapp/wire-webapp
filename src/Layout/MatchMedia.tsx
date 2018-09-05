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
