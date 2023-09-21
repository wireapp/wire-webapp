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

import React, {useEffect, useState} from 'react';

import {BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http/';
import {ConsentType} from '@wireapp/api-client/lib/self/index';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {
  ArrowIcon,
  ContainerXS,
  Form,
  H1,
  Input,
  InputBlock,
  InputSubmitCombo,
  Muted,
  RoundIconButton,
  Text,
} from '@wireapp/react-ui-kit';

import {isBackendError} from 'Util/TypePredicateUtil';

import {Page} from './Page';

import {chooseHandleStrings} from '../../strings';
import {AcceptNewsModal} from '../component/AcceptNewsModal';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import {createSuggestions} from '../util/handleUtil';

type Props = React.HTMLProps<HTMLDivElement>;

function SetHandleComponent({
  doGetConsents,
  doSetConsent,
  doSetHandle,
  hasSelfHandle,
  hasUnsetMarketingConsent,
  checkHandles,
  isFetching,
  name,
}: Props & ConnectedProps & DispatchProps) {
  const {formatMessage: _} = useIntl();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [handle, setHandle] = useState('');

  useEffect(() => {
    if (hasSelfHandle) {
      navigate(ROUTE.INITIAL_INVITE);
    }
  }, [hasSelfHandle]);

  useEffect(() => {
    (async () => {
      doGetConsents();
      try {
        const suggestions = createSuggestions(name);
        const handle = await checkHandles(suggestions);
        setHandle(handle);
      } catch (error) {
        setError(error);
      }
    })();
  }, []);

  const updateConsent = (consentType: ConsentType, value: number): Promise<void> => doSetConsent(consentType, value);

  const onSetHandle = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await doSetHandle(handle.trim());
    } catch (error) {
      if (isBackendError(error) && error.label === BackendErrorLabel.INVALID_HANDLE && handle.trim().length < 2) {
        error.label = SyntheticErrorLabel.HANDLE_TOO_SHORT;
      }
      setError(error);
    }
  };

  const onHandleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setHandle(event.target.value);
  };

  if (hasSelfHandle) {
    return null;
  }

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
        <H1 center>{_(chooseHandleStrings.headline)}</H1>
        <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
        <Form style={{marginTop: 30}} onSubmit={onSetHandle}>
          <InputBlock>
            <InputSubmitCombo style={{paddingLeft: 0}}>
              <Text center style={{minWidth: 38}}>
                @
              </Text>
              <Input
                id="handle"
                name="handle"
                placeholder={_(chooseHandleStrings.handlePlaceholder)}
                type="text"
                onChange={onHandleChange}
                value={handle}
                data-uie-name="enter-handle"
              />
              <RoundIconButton
                disabled={!handle || isFetching}
                type="submit"
                data-uie-name="do-send-handle"
                formNoValidate
              >
                <ArrowIcon />
              </RoundIconButton>
            </InputSubmitCombo>
          </InputBlock>
        </Form>
        {error && parseError(error)}
      </ContainerXS>
      {!isFetching && hasUnsetMarketingConsent && (
        <AcceptNewsModal
          onConfirm={() => updateConsent(ConsentType.MARKETING, 1)}
          onDecline={() => updateConsent(ConsentType.MARKETING, 0)}
        />
      )}
    </Page>
  );
}

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
      doSetHandle: ROOT_ACTIONS.selfAction.setHandle,
    },
    dispatch,
  );

const SetHandle = connect(mapStateToProps, mapDispatchToProps)(SetHandleComponent);

export {SetHandle};
