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
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';

import {Button, ContainerXS, Form, Input, InputBlock, InputSubmitCombo, Text} from '@wireapp/react-ui-kit';

import {StorageKey} from 'src/script/storage';
import {t} from 'Util/LocalizerUtil';
import {storeValue} from 'Util/StorageUtil';
import {isBackendError} from 'Util/TypePredicateUtil';

import {Page} from './Page';

import {AcceptNewsModal} from '../component/AcceptNewsModal';
import {AccountRegistrationLayout} from '../component/AccountRegistrationLayout';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action';
import {bindActionCreators, RootState} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {QUERY_KEY} from '../route';
import {parseError} from '../util/errorUtil';
import {createSuggestions} from '../util/handleUtil';
import {pathWithParams} from '../util/urlUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const SetHandleComponent = ({
  doGetConsents,
  doSetConsent,
  doSetHandle,
  hasSelfHandle,
  hasUnsetMarketingConsent,
  checkHandles,
  isFetching,
  name,
  removeLocalStorage,
}: Props & ConnectedProps & DispatchProps) => {
  const [error, setError] = useState(null);
  const [handle, setHandle] = useState('');

  useEffect(() => {
    if (hasSelfHandle) {
      void removeLocalStorage(QUERY_KEY.JOIN_EXPIRES);
      window.location.replace(pathWithParams(EXTERNAL_ROUTE.WEBAPP));
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

  const handleAcceptNewletterConsent = () => {
    void updateConsent(ConsentType.MARKETING, 1);
    storeValue(StorageKey.INITIAL_MAKRETING_CONSENT_ACCEPTED, true);
  };

  const handleDeclineNewletterConsent = () => {
    void updateConsent(ConsentType.MARKETING, 0);
    storeValue(StorageKey.INITIAL_MAKRETING_CONSENT_ACCEPTED, false);
  };

  if (hasSelfHandle) {
    return null;
  }

  return (
    <Page>
      <AccountRegistrationLayout>
        <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', padding: '16px'}}>
          <Text fontSize="24px" css={{fontWeight: '500', marginBottom: '8px'}} center>
            {t('chooseHandle.headline')}
          </Text>
          <Text block center>
            {t('chooseHandle.subhead')}
          </Text>
          <Form style={{marginTop: 24}} onSubmit={onSetHandle}>
            <InputBlock>
              <InputSubmitCombo style={{paddingLeft: 0}}>
                <Text center style={{minWidth: 38}} bold>
                  {'@'}
                </Text>
                <Input
                  id="handle"
                  name="handle"
                  placeholder={t('chooseHandle.handlePlaceholder')}
                  type="text"
                  onChange={onHandleChange}
                  value={handle}
                  data-uie-name="enter-handle"
                />
              </InputSubmitCombo>
            </InputBlock>
            <Button disabled={!handle || isFetching} type="submit" data-uie-name="do-send-handle" block>
              {t('chooseHandle.submitButton')}
            </Button>
          </Form>
          {error && parseError(error)}
        </ContainerXS>
        {!isFetching && hasUnsetMarketingConsent && (
          <AcceptNewsModal onConfirm={handleAcceptNewletterConsent} onDecline={handleDeclineNewletterConsent} />
        )}
      </AccountRegistrationLayout>
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
      doSetHandle: ROOT_ACTIONS.selfAction.setHandle,
      removeLocalStorage: ROOT_ACTIONS.localStorageAction.deleteLocalStorage,
    },
    dispatch,
  );

const SetHandle = connect(mapStateToProps, mapDispatchToProps)(SetHandleComponent);

export {SetHandle};
