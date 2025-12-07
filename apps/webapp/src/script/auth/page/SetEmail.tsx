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
import {t} from 'Util/LocalizerUtil';

import {Button, ContainerXS, Form, H1, Input} from '@wireapp/react-ui-kit';

import {Page} from './Page';

import {Exception} from '../component/Exception';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';

type Props = React.HTMLProps<HTMLDivElement>;

const SetEmailComponent = ({
  hasSelfEmail,
  isSelfSSOUser,
  doSetEmail,
  isFetching,
}: Props & ConnectedProps & DispatchProps) => {
  const emailInput = useRef<HTMLInputElement>();
  const [error, setError] = useState();
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const onSetEmail = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    let validationError: Error;

    const currentInputNode = emailInput.current;
    currentInputNode.value = currentInputNode.value.trim();
    currentInputNode.focus();
    if (!currentInputNode.checkValidity()) {
      validationError = ValidationError.handleValidationState(currentInputNode.name, currentInputNode.validity);
    }
    setIsValidEmail(currentInputNode.validity.valid);
    try {
      if (validationError) {
        throw validationError;
      }
      await doSetEmail(currentInputNode.value);
      navigate(ROUTE.VERIFY_EMAIL_LINK);
    } catch (error) {
      setError(error);
    }
  };

  if (hasSelfEmail || isSelfSSOUser) {
    return <Navigate to={ROUTE.SET_PASSWORD} />;
  }
  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <Form onSubmit={onSetEmail}>
          <H1 center>{t('setEmail.headline')}</H1>
          <Input
            name="email"
            placeholder={t('setEmail.emailPlaceholder')}
            type="email"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              emailInput.current.setCustomValidity('');
              setEmail(event.target.value);
              setError(null);
              setIsValidEmail(true);
            }}
            autoComplete="email"
            value={email}
            ref={emailInput}
            markInvalid={!isValidEmail}
            maxLength={128}
            required
            data-uie-name="enter-email"
          />
          {!error ? <>&nbsp;</> : <Exception errors={[error]} />}
          <Button
            block
            showLoading={isFetching}
            disabled={isFetching || !email}
            formNoValidate
            type="submit"
            data-uie-name="do-verify-email"
          >
            {t('setEmail.button')}
          </Button>
        </Form>
      </ContainerXS>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  hasSelfEmail: SelfSelector.hasSelfEmail(state),
  isFetching: SelfSelector.isFetching(state),
  isSelfSSOUser: SelfSelector.isSSOUser(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      doSetEmail: actionRoot.selfAction.doSetEmail,
    },
    dispatch,
  );

const SetEmail = connect(mapStateToProps, mapDispatchToProps)(SetEmailComponent);

export {SetEmail};
