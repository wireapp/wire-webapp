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

import {ConsentType} from '@wireapp/api-client/src/self/index';
import {ContainerXS, H1, Muted} from '@wireapp/react-ui-kit';
import React, {MouseEvent, useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {chooseHandleStrings} from '../../strings';
import Canvas from '../component/Canvas';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
// import {BackendError} from '../module/action/BackendError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
// import {createSuggestions} from '../util/entropyUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetEntropy = ({
  doGetConsents,
  doSetConsent,
  // doSetEntropy,
  hasSelfHandle,
  hasUnsetMarketingConsent,
  checkHandles,
  isFetching,
  name,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [error, setError] = useState(null);
  const [frameCount, setFrameCount] = useState(0);
  const [entropy, SetEntropy] = useState<[number, number][]>([]);

  useEffect(() => {
    if (hasSelfHandle) {
      history.push(ROUTE.INITIAL_INVITE);
    }
  }, [hasSelfHandle]);

  useEffect(() => {
    (async () => {
      doGetConsents();
      try {
        // const suggestions = createSuggestions(name);
        // const entropy = await checkHandles(suggestions);
        SetEntropy(entropy);
      } catch (error) {
        setError(error);
      }
    })();
  }, []);

  const onMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    setError(null);
    setFrameCount(frameCount + 1);
    event.persist();
    SetEntropy(entropy => [
      ...entropy,
      [event.screenX - window.innerWidth / 2 + 144, event.screenY - window.innerHeight / 2 - 144],
    ]);
    // console.log(
    //   event.screenX,
    //   event.screenY,
    //   event.screenX - window.innerWidth / 2 + 144,
    //   event.screenY - window.innerHeight / 2 - 144,
    // );
  };

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (entropy.length > 1 && frameCount > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'blue';
        ctx.moveTo(...entropy[frameCount - 2]);
        ctx.lineTo(...entropy[frameCount - 1]);
        ctx.stroke();
      }
    },
    [entropy],
  );

  // const onSetEntropy = async (event: React.FormEvent): Promise<void> => {
  //   event.preventDefault();
  //   try {
  //     // await doSetEntropy(entropy.trim());
  //   } catch (error) {
  //     if (error.label === BackendError.HANDLE_ERRORS.INVALID_HANDLE && entropy.trim().length < 2) {
  //       error.label = BackendError.HANDLE_ERRORS.HANDLE_TOO_SHORT;
  //     }
  //     setError(error);
  //   }
  // };

  if (hasSelfHandle) {
    return null;
  }

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
        <H1 center>{_(chooseHandleStrings.headline)}</H1>
        <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
        <Canvas
          style={{
            alignSelf: 'center',
            backgroundColor: 'white',

            borderRadius: '5px',
            height: '255px',
            width: '255px',
          }}
          draw={draw}
          onMouseMove={onMouseMove}
          data-uie-name="enter-entropy"
        />
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
