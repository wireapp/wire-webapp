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

import React, {useState} from 'react';

import {useIntl} from 'react-intl';

import {Button, CheckRoundIcon, ContainerSM, H1, Muted, Text} from '@wireapp/react-ui-kit';

import {KEY} from 'Util/KeyboardUtil';

import {setEntropyStrings} from '../../strings';
import {EntropyData} from '../../util/Entropy';
import {EntropyCanvas} from '../component/EntropyCanvas';
import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  onSetEntropy: (entropyData: Uint8Array) => void;
  containerSize?: number;
}

const EntropyContainer = ({onSetEntropy, containerSize = 400}: Props) => {
  const {formatMessage: _} = useIntl();
  const [entropy, setEntropy] = useState<EntropyData>(new EntropyData());
  const [pause, setPause] = useState<boolean>();
  const [percent, setPercent] = useState(0);

  const onProgress = (entropyData: EntropyData, percentage: number, pause: boolean) => {
    setEntropy(entropyData);
    setPause(pause);
    setPercent(percentage);
  };

  return (
    <ContainerSM
      centerText
      verticalCenter
      style={{
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-around',
        minHeight: 428,
      }}
    >
      <H1 center css={{marginBottom: 16}}>
        {_(setEntropyStrings.headline)}
      </H1>
      {percent >= 100 ? (
        <>
          <CheckRoundIcon width={64} height={64} css={{alignSelf: 'center', marginBottom: 64}} />
          <Muted center style={{marginBottom: 40}}>
            {_(setEntropyStrings.success)}
          </Muted>
          <Button
            css={{width: '70%'}}
            onClick={() => onSetEntropy(entropy.entropyData)}
            data-uie-name="do-entropy-confirm"
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === KEY.ENTER) {
                onSetEntropy(entropy.entropyData);
              }
            }}
          >
            {_(setEntropyStrings.continue)}
          </Button>
        </>
      ) : (
        <>
          <Muted center css={{marginBottom: '24px'}}>
            {_(setEntropyStrings.subheadline)}
          </Muted>
          <EntropyCanvas
            css={{border: pause ? 'red 2px solid' : 'black 2px solid'}}
            data-uie-name="element-entropy-canvas"
            sizeX={containerSize}
            sizeY={containerSize}
            onProgress={onProgress}
            minEntropyBits={1024}
            minFrames={300}
          />
          <ProgressBar error={!!pause} width={containerSize} percent={percent} />
          <Text data-uie-name="element-entropy-percent" center>
            {percent}%
          </Text>
        </>
      )}
    </ContainerSM>
  );
};

export {EntropyContainer};
