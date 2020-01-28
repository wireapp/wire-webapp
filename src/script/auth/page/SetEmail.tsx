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

import {Button, ContainerXS, Form, H1, Input} from '@wireapp/react-ui-kit';
import React, {useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {setEmailStrings} from '../../strings';
import Exception from '../component/Exception';
import {actionRoot} from '../module/action';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as SelfSelector from '../module/selector/SelfSelector';
import {ROUTE} from '../route';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const SetEmail = ({hasSelfEmail, isSelfSSOUser, doSetEmail, isFetching}: Props & ConnectedProps & DispatchProps) => {
  const {formatMessage: _} = useIntl();

  const emailInput = useRef<HTMLInputElement>();
  const [error, setError] = useState();
  const [isValidEmail, setIsValidEmail] = useState(true);
  const [email, setEmail] = useState('');
  const {history} = useReactRouter();

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
      history.push(ROUTE.VERIFY_EMAIL_LINK);
    } catch (error) {
      setError(error);
    }
  };

  if (hasSelfEmail || isSelfSSOUser) {
    history.push(ROUTE.SET_PASSWORD);
    return null;
  }
  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <Form onSubmit={onSetEmail}>
          <H1 center>{_(setEmailStrings.headline)}</H1>
          <Input
            name="email"
            placeholder={_(setEmailStrings.emailPlaceholder)}
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
            autoFocus
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
            {_(setEmailStrings.button)}
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

export default connect(mapStateToProps, mapDispatchToProps)(SetEmail);
