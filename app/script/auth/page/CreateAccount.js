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
import {withRouter} from 'react-router';
import {Container, ContainerXS, Columns, Column} from '@wireapp/react-ui-kit/Layout';
import {H1, Link} from '@wireapp/react-ui-kit/Text';
import {Form, Input, InputBlock, Button, Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit/Form';
import {ArrowIcon} from '@wireapp/react-ui-kit/Icon';
import ROUTE from '../route';
import {Link as RRLink} from 'react-router-dom';
import {COLOR} from '@wireapp/react-ui-kit/Identity';

const CreateAccount = ({history}) => (
  <Container centerText verticalCenter style={{width: '100%'}}>
    <Columns>
      <Column style={{display: 'flex'}}>
        <div style={{margin: 'auto'}}>
          <Link to={ROUTE.NEWTEAM} data-uie-name="go-register-team" component={RRLink}>
            <ArrowIcon direction="left" color={COLOR.GRAY} />
          </Link>
        </div>
      </Column>
      <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
        <ContainerXS
          centerText
          style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
        >
          <H1 center>{'Set up your account'}</H1>
          <Form
            style={{
              display: 'flex',
              flexDirection: 'column',
              flexGrow: 1,
              justifyContent: 'space-between',
              marginTop: 15,
            }}
          >
            <InputBlock>
              <Input data-uie-name="enter-name" placeholder={'Name'} autoFocus />
              <Input
                data-uie-name="enter-email"
                placeholder={'you@yourcompany.com'}
                placeholderTextTransform="unset"
                type="email"
              />
              <Input data-uie-name="enter-password" type="password" placeholder={'Password (min 8 characters)'} />{' '}
            </InputBlock>
            <Checkbox data-uie-name="do-terms" style={{justifyContent: 'center'}}>
              <CheckboxLabel>
                {'I ACCEPT THE '}
                <a data-uie-name="go-terms" href="#">
                  {'TERMS AND CONDITIONS'}
                </a>
              </CheckboxLabel>
            </Checkbox>
            <Button
              data-uie-name="do-next"
              style={{margin: '0 auto', width: 184}}
              type="submit"
              onClick={() => history.push(ROUTE.VERIFY)}
            >
              {'Next'}
            </Button>
          </Form>
        </ContainerXS>
      </Column>
      <Column />
    </Columns>
  </Container>
);

export default withRouter(CreateAccount);
