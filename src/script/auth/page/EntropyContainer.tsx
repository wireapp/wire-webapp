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
import React from 'react';

import {setEntropyStrings} from '../../strings';
import {useIntl} from 'react-intl';
import {EntropyCanvas, percent, frameCount, pause} from '../component/Canvas';

import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {
  entropy: [number, number][];
  onSetEntropy: () => void;
  setEntropy: React.Dispatch<React.SetStateAction<[number, number][]>>;
}

const EntropyContainer = ({setEntropy, entropy, onSetEntropy}: Props) => {
  const {formatMessage: _} = useIntl();

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
            onSetEntropy={onSetEntropy}
            setEntropy={setEntropy}
            entropy={entropy}
          />
          <ProgressBar
            error={pause}
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
