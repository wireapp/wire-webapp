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

import React, {useRef, useState} from 'react';

import {connect} from 'react-redux';
import {Navigate, useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

import {ValidationUtil} from '@wireapp/commons';
import {Button, ContainerXS, Form, H1, Input, Small} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {Page} from './Page';

import {Config} from '../../Config';
import {Exception} from '../component/Exception';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const SetPasswordComponent = ({
  isSelfSSOUser,
  hasSelfPassword,
  doSetPassword,
  isFetching,
}: Props & ConnectedProps & DispatchProps) => {
  const passwordInput = useRef<HTMLInputElement>();
  const [error, setError] = useState();
  const [isValidPassword, setIsValidPassword] = useState(true);
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const onSetPassword = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    let validationError: Error;

    const currentInputNode = passwordInput.current;
    currentInputNode.focus();
    if (!currentInputNode.checkValidity()) {
      validationError = ValidationError.handleValidationState(currentInputNode.name, currentInputNode.validity);
    }
    setIsValidPassword(currentInputNode.validity.valid);
    try {
      if (validationError) {
        throw validationError;
      }
      await doSetPassword({new_password: password});
      navigate(ROUTE.SET_HANDLE);
    } catch (error) {
      setError(error);
    }
  };

  if (hasSelfPassword || isSelfSSOUser) {
    return <Navigate to={ROUTE.SET_HANDLE} />;
  }

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <Form onSubmit={onSetPassword}>
          <H1 center>{t('setPassword.headline')}</H1>
          <Input
            autoComplete="new-password"
            name="password"
            placeholder={t('setPassword.passwordPlaceholder')}
            type="password"
            togglePasswordShowLabel={t('togglePasswordShowLabel')}
            togglePasswordHideLabel={t('togglePasswordHideLabel')}
            markInvalid={!isValidPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              passwordInput.current.setCustomValidity('');
              setError(null);
              setPassword(event.target.value);
              setIsValidPassword(true);
            }}
            ref={passwordInput}
            value={password}
            required
            pattern={ValidationUtil.getNewPasswordPattern(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)}
            data-uie-name="enter-password"
          />
          <Small
            style={{
              display: error ? 'none' : 'block',
              padding: '0 16px',
            }}
            data-uie-name="element-password-help"
          >
            {t('accountForm.passwordHelp', {minPasswordLength: String(Config.getConfig().NEW_PASSWORD_MINIMUM_LENGTH)})}
          </Small>
          {!error ? <>&nbsp;</> : <Exception errors={[error]} />}
          <Button
            block
            showLoading={isFetching}
            disabled={isFetching || !password}
            formNoValidate
            type="submit"
            data-uie-name="do-set-password"
          >
            {t('setPassword.button')}
          </Button>
        </Form>
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

const SetPassword = connect(mapStateToProps, mapDispatchToProps)(SetPasswordComponent);

export {SetPassword};
