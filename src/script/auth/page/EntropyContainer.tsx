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
import React, {useEffect, useState} from 'react';

import {usePausableInterval} from '../../hooks/usePausableInterval';
import {usePausableTimeout} from '../../hooks/usePausableTimeout';
import {setEntropyStrings} from '../../strings';
import {useIntl} from 'react-intl';
import EntropyCanvas from '../component/Canvas';

import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  entropy: [number, number][];
  error: any;
  onSetEntropy: () => void;
  setEntropy: React.Dispatch<React.SetStateAction<[number, number][]>>;
  setError: React.Dispatch<any>;
}

const EntropyContainer = ({setEntropy, entropy, error, setError, onSetEntropy}: Props) => {
  const [frameCount, setFrameCount] = useState(0);
  const [percent, setPercent] = useState(0);
  const {formatMessage: _} = useIntl();

  const {startTimeout, pauseTimeout} = usePausableTimeout(onSetEntropy, 35000);
  const {clearInterval, startInterval, pauseInterval} = usePausableInterval(
    () => setPercent(percent => percent + 1),
    300,
  );

  useEffect(() => {
    if (frameCount <= 300 && percent > 95) {
      setPercent(95);
      pauseInterval();
      pauseTimeout();
    }
    if (frameCount > 300) {
      startInterval();
      startTimeout();
    }
    if (percent >= 100) {
      clearInterval();
    }
  }, [frameCount, percent]);

  const onMouseEnter = () => {
    setError(null);
    startInterval();
    startTimeout();
  };

  const onMouseLeave = () => {
    pauseInterval();
    pauseTimeout();
    setError(!error);
    setEntropy([...entropy, null]);
  };

  return (
    <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
      <H1 center>{_(setEntropyStrings.headline)}</H1>
      {frameCount > 300 && percent >= 100 ? (
        <>
          <CheckRoundIcon width={64} height={64} css={{alignSelf: 'center', marginBottom: '64px'}} />
          <Muted center>{_(setEntropyStrings.success)}</Muted>
        </>
      ) : (
        <>
          <Muted center css={{marginBottom: '24px'}}>
            {_(setEntropyStrings.subheadline)}
          </Muted>
          <EntropyCanvas
            data-uie-name="element-entropy-canvas"
            sizeX={256}
            sizeY={256}
            style={{
              border: error ? 'red 2px solid' : 'black 2px solid',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            setEntropy={setEntropy}
            entropy={entropy}
            setFrameCount={setFrameCount}
            frameCount={frameCount}
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
      {percent === 95 && frameCount < 300 && <Muted center>{_(setEntropyStrings.moreEntropyNeeded)}</Muted>}
    </ContainerXS>
  );
};

export default EntropyContainer;
