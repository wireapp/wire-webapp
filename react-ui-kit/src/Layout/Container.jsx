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

/* eslint-disable no-magic-numbers */

import {GUTTER, WIDTH} from './sizes';
import PropTypes from 'prop-types';
import {defaultProps} from 'recompose';
import media from '../mediaQueries';
import styled from 'styled-components';

const LEVEL = {
  md: `max-width: ${WIDTH.TABLET_MAX}px;`,
  sm: `max-width: ${WIDTH.TABLET_MIN}px;`,
  xs: `max-width: ${WIDTH.MOBILE}px;`,
  xxs: `max-width: ${WIDTH.TINY}px;`,
};

const Container = styled.div`
  position: relative;
  margin: ${props => (props.verticalCenter ? 'auto' : '0 auto')};
  text-align: ${props => (props.centerText ? 'center' : 'left')};
  width: 100%;

  ${({level}) =>
    LEVEL[level] ||
    `${media.desktop`
            padding: 0;
            width: ${WIDTH.DESKTOP_MIN - GUTTER * 2}px;
          `};
          ${media.desktopXL`
            padding: 0;
            width: ${WIDTH.DESKTOP_MIN - GUTTER * 2}px;
          `};`}
  }};
`;

Container.propTypes = {
  centerText: PropTypes.bool,
  level: PropTypes.oneOf(Object.keys(LEVEL)),
  verticalCenter: PropTypes.bool,
};

Container.defaultProps = {
  centerText: false,
  level: null,
  verticalCenter: false,
};

const ContainerMD = defaultProps({level: 'md'})(Container);
const ContainerSM = defaultProps({level: 'sm'})(Container);
const ContainerXS = defaultProps({level: 'xs'})(Container);
const ContainerXXS = defaultProps({level: 'xxs'})(Container);

export {Container, ContainerMD, ContainerSM, ContainerXS, ContainerXXS};
