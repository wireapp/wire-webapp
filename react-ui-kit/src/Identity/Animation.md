Demo:

```js
import {useState} from 'react';
import {
  BottomUpMovement,
  Button,
  Column,
  Columns,
  Container,
  LeftRightMovement,
  Opacity,
  RightLeftMovement,
  TopDownMovement,
  XAxisMovement,
  YAxisMovement,
} from '@wireapp/react-ui-kit';

const [animateBottomUp, setAnimateBottomUp] = useState(false);
const [animateCombined, setAnimateCombined] = useState(false);
const [animateLeftRight, setAnimateLeftRight] = useState(false);
const [animateOpacity, setAnimateOpacity] = useState(true);
const [animateRightLeft, setAnimateRightLeft] = useState(false);
const [animateTopDown, setAnimateTopDown] = useState(false);
const [animateXAxis, setAnimateXAxis] = useState(false);
const [animateYAxis, setAnimateYAxis] = useState(false);

<Container>
  <Columns>
    <Column>
      <Button onClick={() => setAnimateOpacity(!animateOpacity)}>{'Toggle Opacity Animation'}</Button>
    </Column>
    <Column>
      <Opacity in={animateOpacity} startValue={'0'} endValue={'1'}>
        {'Opacity'}
      </Opacity>
    </Column>
  </Columns>
  <Columns>
    <Column>
      <Button onClick={() => setAnimateTopDown(!animateTopDown)}>{'Toggle TopDown Animation'}</Button>
    </Column>
    <Column>
      <TopDownMovement in={animateTopDown}>{'TopDown'}</TopDownMovement>
    </Column>
  </Columns>
  <Columns>
    <Column>
      <Button onClick={() => setAnimateBottomUp(!animateBottomUp)}>{'Toggle BottomUp Animation'}</Button>
    </Column>
    <Column>
      <BottomUpMovement in={animateBottomUp}>{'BottomUpMovement'}</BottomUpMovement>
    </Column>
  </Columns>
  <Columns>
    <Column>
      <Button onClick={() => setAnimateYAxis(!animateYAxis)}>{'Toggle YAxis Animation'}</Button>
    </Column>
    <Column>
      <YAxisMovement in={animateYAxis} startValue={'50%'} endValue={'-50%'}>
        {'YAxisMovement'}
      </YAxisMovement>
    </Column>
  </Columns>

  <Columns>
    <Column>
      <Button onClick={() => setAnimateLeftRight(!animateLeftRight)}>{'Toggle LeftRight Animation'}</Button>
    </Column>
    <Column>
      <LeftRightMovement in={animateLeftRight}>{'LeftRightMovement'}</LeftRightMovement>
    </Column>
  </Columns>

  <Columns>
    <Column>
      <Button onClick={() => setAnimateXAxis(!animateXAxis)}>{'Toggle XAxis Animation'}</Button>
    </Column>
    <Column>
      <XAxisMovement in={animateXAxis} startValue={'10vh'} endValue={'-10vh'}>
        {'XAxisMovement'}
      </XAxisMovement>
    </Column>
  </Columns>

  <Columns>
    <Column>
      <Button onClick={() => setAnimateRightLeft(!animateRightLeft)}>{'Toggle RightLeft Animation'}</Button>
    </Column>
    <Column>
      <RightLeftMovement in={animateRightLeft}>{'RightLeftMovement'}</RightLeftMovement>
    </Column>
  </Columns>

  <Columns>
    <Column>
      <Button onClick={() => setAnimateCombined(!animateCombined)}>{'Toggle Combined Animation'}</Button>
    </Column>
    <Column>
      <TopDownMovement in={animateCombined}>
        <Opacity in={animateCombined}>
          <XAxisMovement in={animateCombined} startValue={'40vh'} endValue={'10vh'}>
            {'Combined Animation'}
          </XAxisMovement>
        </Opacity>
      </TopDownMovement>
    </Column>
  </Columns>
</Container>;
```
