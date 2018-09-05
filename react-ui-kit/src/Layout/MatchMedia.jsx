import PropTypes from 'prop-types';
import {QUERY} from '../mediaQueries';
import React from 'react';
import {defaultProps} from 'recompose';

class MatchMedia extends React.PureComponent {
  constructor(props) {
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

MatchMedia.propTypes = {
  children: PropTypes.node.isRequired,
  not: PropTypes.bool,
  query: PropTypes.string.isRequired,
};

MatchMedia.defaultProps = {
  not: false,
};

const IsDesktop = defaultProps({query: QUERY.desktop})(MatchMedia);
const IsDesktopXL = defaultProps({query: QUERY.desktopXL})(MatchMedia);
const IsMobile = defaultProps({query: QUERY.mobile})(MatchMedia);
const IsMobileUp = defaultProps({query: QUERY.mobileUp})(MatchMedia);
const IsTablet = defaultProps({query: QUERY.tablet})(MatchMedia);
const IsTabletDown = defaultProps({query: QUERY.tabletDown})(MatchMedia);
const IsTabletUp = defaultProps({query: QUERY.tabletUp})(MatchMedia);

export {MatchMedia, IsDesktop, IsDesktopXL, IsMobile, IsMobileUp, IsTablet, IsTabletDown, IsTabletUp};
