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

import {ConsentType} from '@wireapp/api-client/src/self/index';
import {CheckRoundIcon, ContainerXS, H1, Muted, Text} from '@wireapp/react-ui-kit';
import React, {MouseEvent, PointerEvent, useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import {usePausableInterval} from '../../hooks/usePausableInterval';
import {usePausableTimeout} from '../../hooks/usePausableTimeout';
import useReactRouter from 'use-react-router';
import {chooseHandleStrings} from '../../strings';
import Canvas from '../component/Canvas';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {BackendError} from '../module/action/BackendError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import Page from './Page';
import {ProgressBar} from '../component/ProgressBar';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetEntropy = ({
  doGetConsents,
  doSetConsent,
  // doSetEntropy,
  hasSelfHandle,

  name,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [error, setError] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [entropy, SetEntropy] = useState<[number, number][]>([]);
  const [percent, setPercent] = useState(0);
  const [pause, setPause] = useState(true);

  useEffect(() => {
    if (hasSelfHandle) {
      history.push(ROUTE.INITIAL_INVITE);
    }
  }, [hasSelfHandle]);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement> | PointerEvent<HTMLCanvasElement>) => {
    setError(null);
    setFrameCount(frameCount + 1);

    const newEntropy: [number, number] = [
      event.pageX - event.currentTarget?.getBoundingClientRect()?.x,
      event.pageY - event.currentTarget?.getBoundingClientRect()?.y,
    ];
    SetEntropy(entropy => [...entropy, newEntropy]);
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

  const onSetEntropy = async (): Promise<void> => {
    try {
      // await doSetEntropy(entropy.filter(Boolean));
      alert('entropy');
    } catch (error) {
      if (error.label === BackendError.HANDLE_ERRORS.INVALID_HANDLE) {
        error.label = BackendError.HANDLE_ERRORS.HANDLE_TOO_SHORT;
      }
      setError(error);
    }
  };

  usePausableTimeout(onSetEntropy, 30000, pause);
  usePausableInterval(() => setPercent(percent => percent + 1), 300, pause);

  return (
    <Page>
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
              sizeX={255}
              sizeY={255}
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
                SetEntropy([...entropy, null]);
              }}
              data-uie-name="enter-entropy"
            />
            <ProgressBar
              error={error}
              width={255}
              percent={percent}
              css={{
                alignSelf: 'center',
              }}
            />
            <Text center>{percent}%</Text>
          </>
        )}
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasSelfHandle: SelfSelector.hasSelfHandle(state),
  hasUnsetMarketingConsent: SelfSelector.hasUnsetConsent(state, ConsentType.MARKETING) || false,
  isFetching: SelfSelector.isFetching(state),
  name: SelfSelector.getSelfName(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      checkHandles: ROOT_ACTIONS.userAction.checkHandles,
      doGetConsents: ROOT_ACTIONS.selfAction.doGetConsents,
      doSetConsent: ROOT_ACTIONS.selfAction.doSetConsent,
      // doSetEntropy: ROOT_ACTIONS.selfAction.SetEntropy,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(SetEntropy);
