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

import {ConsentType} from '@wireapp/api-client/dist/commonjs/self/index';
import {
  ContainerXS,
  ErrorMessage,
  Form,
  H1,
  ICON_NAME,
  Input,
  InputSubmitCombo,
  Muted,
  RoundIconButton,
  Text,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useState} from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {RouteComponentProps, withRouter} from 'react-router';
import {chooseHandleStrings} from '../../strings';
import AcceptNewsModal from '../component/AcceptNewsModal';
import {externalRoute as EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {BackendError} from '../module/action/BackendError';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import {createSuggestions} from '../util/handleUtil';
import {pathWithParams} from '../util/urlUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement>, RouteComponentProps {}

interface ConnectedProps {
  hasUnsetMarketingConsent: boolean;
  isFetching: boolean;
  isTeamFlow: boolean;
  name: string;
}

interface DispatchProps {
  doGetConsents: () => Promise<void>;
  checkHandles: (handles: string[]) => Promise<string>;
  doSetHandle: (handle: string) => Promise<void>;
  doSetConsent: (consentType: ConsentType, value: number) => Promise<void>;
}

const ChooseHandle = ({
  history,
  doGetConsents,
  doSetConsent,
  doSetHandle,
  isTeamFlow,
  hasUnsetMarketingConsent,
  checkHandles,
  isFetching,
  name,
  intl: {formatMessage: _},
}: Props & ConnectedProps & DispatchProps & InjectedIntlProps) => {
  const [error, setError] = useState(null);
  const [handle, setHandle] = useState('');
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
      await doSetHandle(handle);
      if (isTeamFlow) {
        history.push(ROUTE.INITIAL_INVITE);
      } else {
        window.location.assign(pathWithParams(EXTERNAL_ROUTE.WEBAPP));
      }
    } catch (error) {
      if (error.label === BackendError.HANDLE_ERRORS.INVALID_HANDLE && handle.trim().length < 2) {
        error.label = BackendError.HANDLE_ERRORS.HANDLE_TOO_SHORT;
      }
      setError(error);
    }
  };

  return (
    <Page>
      <ContainerXS centerText verticalCenter style={{display: 'flex', flexDirection: 'column', minHeight: 428}}>
        <H1 center>{_(chooseHandleStrings.headline)}</H1>
        <Muted center>{_(chooseHandleStrings.subhead)}</Muted>
        <Form style={{marginTop: 30}} onSubmit={onSetHandle}>
          <InputSubmitCombo style={{paddingLeft: 0}}>
            <Text center style={{minWidth: 38}}>
              {'@'}
            </Text>
            <Input
              name="handle"
              placeholder={_(chooseHandleStrings.handlePlaceholder)}
              type="text"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setError(null);
                setHandle(event.currentTarget.value);
              }}
              value={handle}
              autoFocus
              data-uie-name="enter-handle"
            />
            <RoundIconButton
              disabled={!handle || isFetching}
              type="submit"
              icon={ICON_NAME.ARROW}
              data-uie-name="do-send-handle"
              formNoValidate
            />
          </InputSubmitCombo>
        </Form>
        <ErrorMessage data-uie-name="error-message">{error && parseError(error)}</ErrorMessage>
      </ContainerXS>
      {!isFetching && hasUnsetMarketingConsent && (
        <AcceptNewsModal
          onConfirm={() => updateConsent(ConsentType.MARKETING, 1)}
          onDecline={() => updateConsent(ConsentType.MARKETING, 0)}
        />
      )}
    </Page>
  );
};

export default injectIntl(
  withRouter(
    connect(
      (state: RootState): ConnectedProps => ({
        hasUnsetMarketingConsent: SelfSelector.hasUnsetConsent(state, ConsentType.MARKETING) || false,
        isFetching: SelfSelector.isFetching(state),
        isTeamFlow: AuthSelector.isTeamFlow(state),
        name: SelfSelector.getSelfName(state),
      }),
      (dispatch: ThunkDispatch): DispatchProps => ({
        checkHandles: (handles: string[]) => dispatch(ROOT_ACTIONS.userAction.checkHandles(handles)),
        doGetConsents: () => dispatch(ROOT_ACTIONS.selfAction.doGetConsents()),
        doSetConsent: (consentType: ConsentType, value: number) =>
          dispatch(ROOT_ACTIONS.selfAction.doSetConsent(consentType, value)),
        doSetHandle: (handle: string) => dispatch(ROOT_ACTIONS.selfAction.setHandle(handle)),
      })
    )(ChooseHandle)
  )
);
