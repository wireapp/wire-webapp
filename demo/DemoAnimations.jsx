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
import React, {useState} from 'react';

export const DemoAnimations = () => {
  const [animateBottomUp, setAnimateBottomUp] = useState(false);
  const [animateCombined, setAnimateCombined] = useState(false);
  const [animateLeftRight, setAnimateLeftRight] = useState(false);
  const [animateOpacity, setAnimateOpacity] = useState(true);
  const [animateRightLeft, setAnimateRightLeft] = useState(false);
  const [animateTopDown, setAnimateTopDown] = useState(false);
  const [animateXAxis, setAnimateXAxis] = useState(false);
  const [animateYAxis, setAnimateYAxis] = useState(false);

  return (
    <Container>
      <Line />
      <H1>Animations</H1>
      <Columns>
        <Column>
          <Button onClick={() => setAnimateOpacity(!animateOpacity)}>{'Toggle Opacity Animation'}</Button>
          <Opacity in={animateOpacity} startValue={'0'} endValue={'1'}>
            {'Opacity'}
          </Opacity>
        </Column>
      </Columns>
      <Columns>
        <Column>
          <Button onClick={() => setAnimateTopDown(!animateTopDown)}>{'Toggle TopDown Animation'}</Button>
          <TopDownMovement in={animateTopDown}>{'TopDown'}</TopDownMovement>
        </Column>
        <Column>
          <Button onClick={() => setAnimateBottomUp(!animateBottomUp)}>{'Toggle BottomUp Animation'}</Button>
          <BottomUpMovement in={animateBottomUp}>{'BottomUpMovement'}</BottomUpMovement>
        </Column>
        <Column>
          <Button onClick={() => setAnimateYAxis(!animateYAxis)}>{'Toggle YAxis Animation'}</Button>
          <YAxisMovement in={animateYAxis} startValue={'50%'} endValue={'-50%'}>
            {'YAxisMovement'}
          </YAxisMovement>
        </Column>
      </Columns>
      <Columns>
        <Column>
          <Button onClick={() => setAnimateLeftRight(!animateLeftRight)}>{'Toggle LeftRight Animation'}</Button>
          <LeftRightMovement in={animateLeftRight}>{'LeftRightMovement'}</LeftRightMovement>
        </Column>
        <Column>
          <Button onClick={() => setAnimateXAxis(!animateXAxis)}>{'Toggle XAxis Animation'}</Button>
          <XAxisMovement in={animateXAxis} startValue={'10vh'} endValue={'-10vh'}>
            {'XAxisMovement'}
          </XAxisMovement>
        </Column>
        <Column>
          <Button onClick={() => setAnimateRightLeft(!animateRightLeft)}>{'Toggle RightLeft Animation'}</Button>
          <RightLeftMovement in={animateRightLeft}>{'RightLeftMovement'}</RightLeftMovement>
        </Column>
      </Columns>
      <br />
      <Button onClick={() => setAnimateCombined(!animateCombined)}>{'Toggle Combined Animation'}</Button>
      <TopDownMovement in={animateCombined}>
        <Opacity in={animateCombined}>
          <XAxisMovement in={animateCombined} startValue={'40vh'} endValue={'10vh'}>
            {'Combined Animation'}
          </XAxisMovement>
        </Opacity>
      </TopDownMovement>
    </Container>
  );
};
