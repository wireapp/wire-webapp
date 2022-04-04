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
import React, {useState} from 'react';

import {setEntropyStrings} from '../../strings';
import {useIntl} from 'react-intl';
import EntropyCanvas from '../component/EntropyCanvas';

import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  onSetEntropy: (entropyData: [number, number][]) => void;
}

const EntropyContainer = ({onSetEntropy}: Props) => {
  const {formatMessage: _} = useIntl();
  const [entropy, setEntropy] = useState<[number, number][]>([]);
  const [pause, setPause] = useState<boolean>(undefined);
  const [percent, setPercent] = useState(0);

  const frames = entropy.filter(Boolean).length;
  const onProgress = (entropyData: [number, number][], percentage: number, pause: boolean) => {
    setEntropy(entropyData);
    setPause(pause);
    setPercent(percentage);
  };

  return (
    <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
      <H1 center>{_(setEntropyStrings.headline)}</H1>
      {frames > 300 && percent >= 100 ? (
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
            css={{border: pause ? 'red 2px solid' : 'black 2px solid'}}
            data-uie-name="element-entropy-canvas"
            sizeX={256}
            sizeY={256}
            onSetEntropy={onSetEntropy}
            onProgress={onProgress}
          />
          <ProgressBar error={pause} width={256} percent={percent} />
          <Text data-uie-name="element-entropy-percent" center>
            {percent}%
          </Text>
        </>
      )}
      {percent === 95 && frames < 300 && <Muted center>{_(setEntropyStrings.moreEntropyNeeded)}</Muted>}
    </ContainerXS>
  );
};

export default EntropyContainer;
