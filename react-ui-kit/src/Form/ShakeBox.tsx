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
import {jsx} from '@emotion/core';
import React from 'react';

interface ShakeBoxProps {
  amp?: number;
  damping?: number;
  speed?: number;
  threshold?: number;
}

interface ShakeBoxStateProps {
  isShaking?: boolean;
  offset?: number;
}

class ShakeBox extends React.PureComponent<ShakeBoxProps & React.HTMLProps<HTMLDivElement>, ShakeBoxStateProps> {
  state = {isShaking: false, offset: 0};
  currentOffset = 0;
  targetOffset?: number;
  reqAni?: number;
  box?: HTMLDivElement;

  static defaultProps = {
    amp: 8,
    children: null,
    damping: 0.75,
    speed: 4,
    threshold: 1,
  };

  shakeLoop = () => {
    const {speed, threshold} = this.props;
    if (this.targetOffset > 0 && this.currentOffset < this.targetOffset) {
      this.currentOffset += speed;
    } else if (this.targetOffset < 0 && this.currentOffset > this.targetOffset) {
      this.currentOffset -= speed;
    } else {
      this.currentOffset = this.targetOffset - (this.currentOffset - this.targetOffset);
      this.targetOffset *= -this.props.damping;
    }
    if (Math.abs(this.targetOffset) >= threshold) {
      this.reqAni = requestAnimationFrame(this.shakeLoop);
    } else {
      this.currentOffset = 0;
      this.setState({isShaking: false});
    }
    this.setState({offset: this.currentOffset});
  };

  shake = () => {
    this.setState({isShaking: true});
    this.targetOffset = this.props.amp;
    cancelAnimationFrame(this.reqAni);
    this.shakeLoop();
  };

  componentWillUnmount() {
    cancelAnimationFrame(this.reqAni);
  }

  render() {
    return (
      <div ref={node => (this.box = node)} style={{transform: `translateX(${this.state.offset}px)`}}>
        {this.props.children}
      </div>
    );
  }
}

export {ShakeBox};
