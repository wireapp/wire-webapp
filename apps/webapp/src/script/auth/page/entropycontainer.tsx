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

import React, {useEffect, useState} from 'react';

import {Button, CheckRoundIcon, ContainerSM, H1, Muted, Text} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';
import {handleEnterDown} from 'Util/keyboardUtil';

import {styles} from './entropycontainer.styles';

import {EntropyData} from '../../util/entropy';
import {EntropyCanvas} from '../component/entropycanvas';
import {ProgressBar} from '../component/progressbar';

const PROGRESS_COMPLETE_PERCENT = 100;
const PROGRESS_MILESTONE_STEP = 25;

interface Props extends React.HTMLProps<HTMLDivElement> {
  onSetEntropy: (entropyData: Uint8Array) => void;
  containerSize?: number;
}

const EntropyContainer = ({onSetEntropy, containerSize = 400}: Props) => {
  const {translate} = useApplicationContext();
  const [entropy, setEntropy] = useState<EntropyData>(new EntropyData());
  const [pause, setPause] = useState<boolean | undefined>(undefined);
  const [percent, setPercent] = useState(0);
  const [progressAnnouncement, setProgressAnnouncement] = useState('');
  const [lastAnnouncedMilestone, setLastAnnouncedMilestone] = useState(0);

  const entropyInstruction = translate('setEntropy.a11yInstruction');

  useEffect(() => {
    const clampedPercent = Math.min(PROGRESS_COMPLETE_PERCENT, Math.max(0, percent));
    const milestone = Math.floor(clampedPercent / PROGRESS_MILESTONE_STEP) * PROGRESS_MILESTONE_STEP;

    if (milestone < PROGRESS_MILESTONE_STEP || milestone <= lastAnnouncedMilestone) {
      return;
    }

    setLastAnnouncedMilestone(milestone);
    setProgressAnnouncement(translate('setEntropy.progressAnnouncement', {percent: milestone}));
  }, [lastAnnouncedMilestone, percent, translate]);

  const onProgress = (entropyData: EntropyData, percentage: number, pause: boolean) => {
    setEntropy(entropyData);
    setPause(pause);
    setPercent(percentage);
  };

  const forwardEntropy = async (entropy: Uint8Array) => {
    // we want to hash the entire entropy array to get a 256 bit (32 bytes) array
    const hashedValue = await window.crypto.subtle.digest('SHA-256', Uint8Array.from(entropy));
    onSetEntropy(new Uint8Array(hashedValue));
  };

  return (
    <ContainerSM centerText verticalCenter style={styles.container}>
      <H1 center css={styles.headline}>
        {translate('setEntropy.headline')}
      </H1>
      {percent >= PROGRESS_COMPLETE_PERCENT ? (
        <>
          <CheckRoundIcon width={64} height={64} css={styles.successIcon} />
          <Muted center style={styles.successText}>
            {translate('setEntropy.success')}
          </Muted>
          <Button
            css={styles.continueButton}
            onClick={() => forwardEntropy(entropy.entropyData)}
            data-uie-name="do-entropy-confirm"
            onKeyDown={event => handleEnterDown(event, () => forwardEntropy(entropy.entropyData))}
          >
            {translate('setEntropy.continue')}
          </Button>
        </>
      ) : (
        <>
          <Muted center css={styles.subheadline}>
            {translate('setEntropy.subheadline')}
          </Muted>
          <EntropyCanvas
            css={styles.entropyCanvas(pause === true)}
            data-uie-name="element-entropy-canvas"
            ariaLabel={entropyInstruction}
            sizeX={containerSize}
            sizeY={containerSize}
            onProgress={onProgress}
            minEntropyBits={1024}
            minFrames={300}
          />
          <ProgressBar
            error={pause === true}
            width={containerSize}
            percent={percent}
            ariaLabel={translate('setEntropy.progressAriaLabel')}
          />
          <div aria-live="polite" aria-atomic="true" style={styles.screenReaderOnly}>
            {progressAnnouncement}
          </div>
          <Text data-uie-name="element-entropy-percent" center>
            {percent}%
          </Text>
        </>
      )}
    </ContainerSM>
  );
};

export {EntropyContainer};
