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

import {
  BottomUpMovement,
  Button,
  Column,
  Columns,
  Container,
  H1,
  LeftRightMovement,
  Line,
  Opacity,
  RightLeftMovement,
  TopDownMovement,
  XAxisMovement,
  YAxisMovement,
} from '@wireapp/react-ui-kit';
import React from 'react';

class DemoAnimations extends React.PureComponent {
  state = {
    showBottomUpAnimation: false,
    showCombinedAnimation: false,
    showLeftRightAnimation: false,
    showOpacityAnimation: false,
    showRightLeftAnimation: false,
    showTopDownAnimation: false,
    showXAxisAnimation: false,
    showYAxisAnimation: false,
  };

  render() {
    return (
      <Container>
        <Line />
        <H1>Animations</H1>
        <Columns>
          <Column>
            <Button
              onClick={() => this.setState(({showOpacityAnimation}) => ({showOpacityAnimation: !showOpacityAnimation}))}
            >
              {'Toggle Opacity Animation'}
            </Button>
            <Opacity in={this.state.showOpacityAnimation} startValue={'0'} endValue={'1'}>
              {'Opacity'}
            </Opacity>
          </Column>
        </Columns>
        <Columns>
          <Column>
            <Button
              onClick={() => this.setState(({showTopDownAnimation}) => ({showTopDownAnimation: !showTopDownAnimation}))}
            >
              {'Toggle TopDown Animation'}
            </Button>
            <TopDownMovement in={this.state.showTopDownAnimation}>{'TopDown'}</TopDownMovement>
          </Column>
          <Column>
            <Button
              onClick={() =>
                this.setState(({showBottomUpAnimation}) => ({showBottomUpAnimation: !showBottomUpAnimation}))
              }
            >
              {'Toggle BottomUp Animation'}
            </Button>
            <BottomUpMovement in={this.state.showBottomUpAnimation}>{'BottomUpMovement'}</BottomUpMovement>
          </Column>
          <Column>
            <Button
              onClick={() => this.setState(({showYAxisAnimation}) => ({showYAxisAnimation: !showYAxisAnimation}))}
            >
              {'Toggle YAxis Animation'}
            </Button>
            <YAxisMovement in={this.state.showYAxisAnimation} startValue={'50%'} endValue={'-50%'}>
              {'YAxisMovement'}
            </YAxisMovement>
          </Column>
        </Columns>
        <Columns>
          <Column>
            <Button
              onClick={() =>
                this.setState(({showLeftRightAnimation}) => ({showLeftRightAnimation: !showLeftRightAnimation}))
              }
            >
              {'Toggle LeftRight Animation'}
            </Button>
            <LeftRightMovement in={this.state.showLeftRightAnimation}>{'LeftRightMovement'}</LeftRightMovement>
          </Column>
          <Column>
            <Button
              onClick={() => this.setState(({showXAxisAnimation}) => ({showXAxisAnimation: !showXAxisAnimation}))}
            >
              {'Toggle XAxis Animation'}
            </Button>
            <XAxisMovement in={this.state.showXAxisAnimation} startValue={'10vh'} endValue={'-10vh'}>
              {'XAxisMovement'}
            </XAxisMovement>
          </Column>
          <Column>
            <Button
              onClick={() =>
                this.setState(({showRightLeftAnimation}) => ({showRightLeftAnimation: !showRightLeftAnimation}))
              }
            >
              {'Toggle RightLeft Animation'}
            </Button>
            <RightLeftMovement in={this.state.showRightLeftAnimation}>{'RightLeftMovement'}</RightLeftMovement>
          </Column>
        </Columns>
        <br />
        <Button
          onClick={() => this.setState(({showCombinedAnimation}) => ({showCombinedAnimation: !showCombinedAnimation}))}
        >
          {'Toggle Combined Animation'}
        </Button>
        <TopDownMovement in={this.state.showCombinedAnimation}>
          <Opacity in={this.state.showCombinedAnimation} isInnerAnimation>
            <XAxisMovement in={this.state.showCombinedAnimation} startValue={'40vh'} endValue={'10vh'} isInnerAnimation>
              {'Combined Animation'}
            </XAxisMovement>
          </Opacity>
        </TopDownMovement>
      </Container>
    );
  }
}

export default DemoAnimations;
