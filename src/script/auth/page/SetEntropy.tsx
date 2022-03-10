/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CheckRoundIcon, ContainerXS, H1, Muted, Text} from '@wireapp/react-ui-kit';
import React, {MouseEvent, PointerEvent, useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {usePausableInterval} from '../../hooks/usePausableInterval';
import {usePausableTimeout} from '../../hooks/usePausableTimeout';

import {chooseHandleStrings} from '../../strings';
import Canvas from '../component/Canvas';

import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  entropy: [number, number][];
  error: any;
  onSetEntropy: () => void;
  setEntropy: React.Dispatch<React.SetStateAction<[number, number][]>>;
  setError: React.Dispatch<any>;
}

const SetEntropy = ({setEntropy, entropy, error, setError, onSetEntropy}: Props) => {
  const {formatMessage: _} = useIntl();

  const [frameCount, setFrameCount] = useState(0);
  const [percent, setPercent] = useState(0);
  const [pause, setPause] = useState(true);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement> | PointerEvent<HTMLCanvasElement>) => {
    setError(null);
    setFrameCount(frameCount + 1);

    const newEntropy: [number, number] = [
      event.pageX - event.currentTarget?.getBoundingClientRect()?.x,
      event.pageY - event.currentTarget?.getBoundingClientRect()?.y,
    ];
    setEntropy(entropy => [...entropy, newEntropy]);
  };

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (entropy.length > 1 && frameCount > 1) {
        ctx.beginPath();
        if (!entropy[frameCount - 2]) {
          ctx.moveTo(...entropy[frameCount - 1]);
        } else {
          ctx.moveTo(...entropy[frameCount - 2]);
        }
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'blue';
        if (!entropy[frameCount - 1]) {
          ctx.lineTo(...entropy[frameCount - 2]);
        } else {
          ctx.lineTo(...entropy[frameCount - 1]);
        }
        ctx.stroke();
      }
    },
    [entropy],
  );

  usePausableTimeout(onSetEntropy, 30000, pause);
  usePausableInterval(() => setPercent(percent => percent + 1), 300, pause);

  return (
    <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
      <H1 center>{_(chooseHandleStrings.headline)}</H1>
      {entropy.length > 300 && percent >= 100 ? (
        <>
          <CheckRoundIcon width={64} height={64} css={{alignSelf: 'center', marginBottom: '64px'}} />
          <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
        </>
      ) : (
        <>
          <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
          <Canvas
            sizeX={256}
            sizeY={256}
            style={{
              alignSelf: 'center',
              backgroundColor: 'white',
              border: error ? 'red 2px solid' : 'black 2px solid',
              borderRadius: '5px',
              height: '255px',
              width: '255px',
            }}
            draw={draw}
            onMouseMove={onMouseMove}
            onMouseEnter={() => setPause(false)}
            onMouseLeave={() => {
              setPause(true);
              setError(!error);
              setEntropy([...entropy, null]);
            }}
            data-uie-name="enter-entropy"
          />
          <ProgressBar
            error={error}
            width={256}
            percent={percent}
            css={{
              alignSelf: 'center',
            }}
          />
          <Text center>{percent}%</Text>
        </>
      )}
    </ContainerXS>
  );
};

export default SetEntropy;
