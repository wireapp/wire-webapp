/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Button, ContainerXS, ErrorMessage, H1, Input} from '@wireapp/react-ui-kit';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {setPasswordStrings} from '../../strings';
import {actionRoot} from '../module/action';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import {parseError} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetPassword = ({
  isSelfSSOUser,
  hasSelfPassword,
  doSetPassword,
  isFetching,
}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();
  const [error, setError] = useState();
  const [password, setPassword] = useState('');
  const {history} = useReactRouter();

  const onSetPassword = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      // TODO: Validate password
      await doSetPassword({new_password: password});
      history.push(ROUTE.SET_HANDLE);
    } catch (error) {
      setError(error);
    }
  };

  if (hasSelfPassword || isSelfSSOUser) {
    history.push(ROUTE.SET_HANDLE);
    return null;
  }

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <div>
          <H1 center>{_(setPasswordStrings.headline)}</H1>
          <Input
            name="new-password"
            placeholder={_(setPasswordStrings.passwordPlaceholder)}
            type="password"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setError(null);
              setPassword(event.currentTarget.value);
            }}
            value={password}
            autoFocus
            required
            data-uie-name="enter-password"
          />
          <ErrorMessage data-uie-name="error-message">{parseError(error)}</ErrorMessage>
          <Button onClick={onSetPassword} showLoading={isFetching} disabled={isFetching} />
        </div>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasSelfPassword: SelfSelector.hasSelfPassword(state),
  isFetching: SelfSelector.isFetching(state),
  isSelfSSOUser: SelfSelector.isSSOUser(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doSetPassword: actionRoot.selfAction.doSetPassword,
    },
    dispatch,
  );

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SetPassword);
