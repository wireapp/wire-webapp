/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import React from 'react';
import {ContainerXS} from '@wireapp/react-ui-kit/Layout';
import {H1, Text, Link} from '@wireapp/react-ui-kit/Text';
import {CodeInput, ErrorMessage} from '@wireapp/react-ui-kit/Form';
import * as AuthAction from '../module/action/AuthAction';
import * as AuthSelector from '../module/selector/AuthSelector';
import ROUTE from '../route';

const Verify = ({account, authError, history, ...connected}) => {
  const createAccount = () => {
    Promise.resolve()
      .then(() => connected.doRegisterTeam(account))
      .then(() => history.push(ROUTE.INDEX))
      .catch(error => console.error('Failed to create account', error));
  };
  return (
    <ContainerXS
      centerText
      verticalCenter
      style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
    >
      <div>
        <H1 center>{'You’ve got mail'}</H1>
        <Text data-uie-name="label-with-email">
          {'Enter the verification code we sent to'}
          <br />
          {'email@mail.com'}
        </Text>
        <CodeInput data-uie-name="enter-code" autoFocus style={{marginTop: 10}} onCompleteCode={createAccount} />
        <ErrorMessage>{authError}</ErrorMessage>
      </div>
      <div>
        <Link data-uie-name="do-resend-code" href="#">
          {'RESEND CODE'}
        </Link>
        <Link data-uie-name="go-change-email" href="#" style={{marginLeft: 35}}>
          {'CHANGE EMAIL'}
        </Link>
      </div>
    </ContainerXS>
  );
};

export default withRouter(
  injectIntl(
    connect(
      state => ({
        account: AuthSelector.getAccount(state),
        authError: AuthSelector.getError(state),
      }),
      {...AuthAction}
    )(Verify)
  )
);
