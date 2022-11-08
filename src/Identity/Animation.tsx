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

import {ClassNames} from '@emotion/react';

import {DURATION, EASE} from './motions';

const {CSSTransition, TransitionGroup} = require('react-transition-group');

type TransitionProps = Partial<any> & {
  children: React.ReactNode;
  component?: string | React.ComponentType<any>;
};

type OpacityProps = TransitionProps & {
  endValue?: number;
  startValue?: number;
};

type MovementProps = TransitionProps & {
  endValue?: string;
  startValue?: string;
};

type TransitionContainerProps = React.HTMLProps<any> & {
  appear?: boolean;
  component?: string;
  enter?: boolean;
  exit?: boolean;
};

export const TransitionContainer = (props: TransitionContainerProps) => <TransitionGroup {...props} />;

export const Transition = ({animationStyle, timeout, component = 'div', children, ...props}: TransitionProps) => (
  <ClassNames>
    {({css}) => (
      <CSSTransition timeout={timeout} classNames={css(animationStyle)} {...props}>
        {component ? React.createElement(component, {}, children) : children}
      </CSSTransition>
    )}
  </ClassNames>
);

export const Opacity = ({startValue = 0, endValue = 1, timeout = DURATION.DEFAULT, ...props}: OpacityProps) => (
  <Transition
    animationStyle={{
      '&-enter': {opacity: startValue},
      '&-enter-active': {
        opacity: endValue,
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit': {opacity: endValue},
      '&-exit-active': {
        opacity: startValue,
        pointerEvents: 'none',
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit-done': {opacity: startValue},
    }}
    timeout={timeout}
    {...props}
  />
);

export const YAxisMovement = ({
  startValue = '-100%',
  endValue = '0%',
  timeout = DURATION.DEFAULT,
  ...props
}: MovementProps) => (
  <Transition
    animationStyle={{
      '&-enter': {transform: `translateY(${startValue})`},
      '&-enter-active': {
        transform: `translateY(${endValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit': {transform: `translateY(${endValue})`},
      '&-exit-active': {
        pointerEvents: 'none',
        transform: `translateY(${startValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit-done': {transform: `translateY(${startValue})`},
    }}
    timeout={timeout}
    {...props}
  />
);

export const XAxisMovement = ({
  startValue = '-100%',
  endValue = '0%',
  timeout = DURATION.DEFAULT,
  ...props
}: MovementProps) => (
  <Transition
    animationStyle={{
      '&-enter': {transform: `translateX(${startValue})`},
      '&-enter-active': {
        transform: `translateX(${endValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit': {transform: `translateX(${endValue})`},
      '&-exit-active': {
        pointerEvents: 'none',
        transform: `translateX(${startValue})`,
        transition: `all ${timeout}ms ${EASE.EXPONENTIAL}`,
      },
      '&-exit-done': {transform: `translateX(${startValue})`},
    }}
    timeout={timeout}
    {...props}
  />
);

export const Slide = ({startValue = '-100%', endValue = '0%', timeout = DURATION.DEFAULT, ...props}: MovementProps) => (
  <Transition
    animationStyle={{
      '&-enter': {marginTop: startValue},
      '&-enter-active': {
        marginTop: endValue,
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit': {marginTop: endValue},
      '&-exit-active': {
        marginTop: startValue,
        pointerEvents: 'none',
        transition: `all ${timeout}ms ${EASE.QUART}`,
      },
      '&-exit-done': {marginTop: startValue},
    }}
    timeout={timeout}
    {...props}
  />
);

export const LeftRightMovement = props => <XAxisMovement startValue="-100vh" endValue="0vh" {...props} />;
export const RightLeftMovement = props => <XAxisMovement startValue="100vh" endValue="0vh" {...props} />;

export const TopDownMovement = props => <YAxisMovement startValue="-100%" endValue="0%" {...props} />;
export const BottomUpMovement = props => <YAxisMovement startValue="100%" endValue="0%" {...props} />;
