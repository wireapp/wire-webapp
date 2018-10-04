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

import {defaultProps} from 'recompose';
import transition from 'styled-transition-group';
import {DURATION, EASE} from './motions';

const Opacity = transition.div`
  &:enter {
    opacity: ${({startValue = 0}) => startValue};
  }
  &:enter-active {
    opacity: ${({endValue = 1}) => endValue};
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.QUART};
  }
  &:exit {
    opacity: ${({endValue = 1}) => endValue};
  }
  &:exit-active {
    pointer-events: none;
    opacity: ${({startValue = 0}) => startValue};
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.QUART};
  }
`;

const YAxisMovement = transition.div`
  &:enter {
    transform: translateY(${({startValue}) => startValue});
  }
  &:enter-active {
    transform: translateY(${({endValue}) => endValue});
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.EXPONENTIAL};
  }
  &:exit {
    transform: translateY(${({endValue}) => endValue});
  }
  &:exit-active {
    transform: translateY(${({startValue}) => startValue});
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.EXPONENTIAL};
  }
`;

const TopDownMovement = defaultProps({startValue: '-100%', endValue: '0%'})(YAxisMovement);
const BottomUpMovement = defaultProps({startValue: '100%', endValue: '0%'})(YAxisMovement);

const Slide = transition.div`
&:enter {
  margin-top: ${({startValue = '-100%'}) => startValue};
}
&:enter-active {
  margin-top: ${({endValue = '0'}) => endValue};
  transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.QUART};
}
&:exit {
  margin-top: ${({endValue = '0'}) => endValue};
}
&:exit-active {
  margin-top: ${({startValue = '-100%'}) => startValue};
  transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.QUART};
}
`;

const XAxisMovement = transition.div`
  &:enter {
    transform: translateX(${({startValue}) => startValue});
  }
  &:enter-active {
    transform: translateX(${({endValue}) => endValue});
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.EXPONENTIAL};
  }
  &:exit {
    transform: translateX(${({endValue}) => endValue});
  }
  &:exit-active {
    transform: translateX(${({startValue}) => startValue});
    transition: all ${({timeout = DURATION.DEFAULT}) => timeout}ms ${EASE.EXPONENTIAL};
  }
`;

const LeftRightMovement = defaultProps({startValue: '-100vh', endValue: '0vh'})(XAxisMovement);
const RightLeftMovement = defaultProps({startValue: '100vh', endValue: '0vh'})(XAxisMovement);

export {
  Slide,
  Opacity,
  TopDownMovement,
  BottomUpMovement,
  YAxisMovement,
  LeftRightMovement,
  RightLeftMovement,
  XAxisMovement,
};
