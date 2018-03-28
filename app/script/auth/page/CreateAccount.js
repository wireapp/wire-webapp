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

import {H1, Link, COLOR, ArrowIcon, Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit';
import {createAccountStrings} from '../../strings';
import {injectIntl} from 'react-intl';
import {Link as RRLink} from 'react-router-dom';
import {withRouter} from 'react-router';
import Page from './Page';
import React from 'react';
import {ROUTE} from '../route';
import AccountForm from '../component/AccountForm';

function CreateAccount({history, intl: {formatMessage: _}}) {
  return (
    <Page hasTeamData>
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <Column style={{display: 'flex'}}>
            <div style={{margin: 'auto'}}>
              <Link to={ROUTE.CREATE_TEAM} component={RRLink} data-uie-name="go-register-team">
                <ArrowIcon direction="left" color={COLOR.GRAY} />
              </Link>
            </div>
          </Column>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
            >
              <H1 center>{_(createAccountStrings.headLine)}</H1>
              <AccountForm
                onSubmit={() => history.push(ROUTE.VERIFY)}
                submitText={_(createAccountStrings.submitButton)}
              />
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
    </Page>
  );
}

export default withRouter(injectIntl(CreateAccount));
