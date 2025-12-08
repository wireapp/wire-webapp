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

import {Button, CheckRoundIcon, ContainerSM, H1, Muted, Text} from '@wireapp/react-ui-kit';

import {handleEnterDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {EntropyData} from '../../util/Entropy';
import {EntropyCanvas} from '../component/EntropyCanvas';
import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  onSetEntropy: (entropyData: Uint8Array) => void;
  containerSize?: number;
}

const EntropyContainer = ({onSetEntropy, containerSize = 400}: Props) => {
  const [entropy, setEntropy] = useState<EntropyData>(new EntropyData());
  const [pause, setPause] = useState<boolean>();
  const [percent, setPercent] = useState(0);

  const onProgress = (entropyData: EntropyData, percentage: number, pause: boolean) => {
    setEntropy(entropyData);
    setPause(pause);
    setPercent(percentage);
  };

  const forwardEntropy = async (entropy: Uint8Array) => {
    // we want to hash the entire entropy array to get a 256 bit (32 bytes) array
    const hashedValue = await window.crypto.subtle.digest('SHA-256', entropy);
    onSetEntropy(new Uint8Array(hashedValue));
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
        {t('setEntropy.headline')}
      </H1>
      {percent >= 100 ? (
        <>
          <CheckRoundIcon width={64} height={64} css={{alignSelf: 'center', marginBottom: 64}} />
          <Muted center style={{marginBottom: 40}}>
            {t('setEntropy.success')}
          </Muted>
          <Button
            css={{width: '70%'}}
            onClick={() => forwardEntropy(entropy.entropyData)}
            data-uie-name="do-entropy-confirm"
            onKeyDown={event => handleEnterDown(event, () => forwardEntropy(entropy.entropyData))}
          >
            {t('setEntropy.continue')}
          </Button>
        </>
      ) : (
        <>
          <Muted center css={{marginBottom: '24px'}}>
            {t('setEntropy.subheadline')}
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
