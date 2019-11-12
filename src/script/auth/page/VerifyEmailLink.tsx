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

import {Button, ContainerXS, H1, Muted} from '@wireapp/react-ui-kit';
import React from 'react';
import {useIntl} from 'react-intl';
import {setEmailStrings} from '../../strings';
import Page from './Page';

const VerifyEmailLink = () => {
  const {formatMessage: _} = useIntl();

  return (
    <Page>
      <ContainerXS
        centerText
        verticalCenter
        style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
      >
        <div>
          <H1 center>{_(setEmailStrings.verifyHeadline)}</H1>
          <Muted>{_(setEmailStrings.verifySubhead)}</Muted>
          <Muted>{_(setEmailStrings.resendHeadline)}</Muted>
          <Button>{_(setEmailStrings.resendAction)}</Button>
        </div>
      </ContainerXS>
    </Page>
  );
};

export default VerifyEmailLink;
