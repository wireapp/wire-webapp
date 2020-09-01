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

import {ArrowIcon, COLOR, Column, Columns, Container, ContainerXS, H1, IsMobile} from '@wireapp/react-ui-kit';
import React from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import useReactRouter from 'use-react-router';

import {AnyAction, Dispatch} from 'redux';
import {createPersonalAccountStrings} from '../../strings';
import AccountForm from '../component/AccountForm';
import RouterLink from '../component/RouterLink';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {Runtime} from '@wireapp/commons';
import Page from './Page';

interface Props extends React.HTMLAttributes<HTMLDivElement> {}

const CreatePersonalAccount = ({isPersonalFlow, enterPersonalCreationFlow}: Props & ConnectedProps & DispatchProps) => {
  const {history} = useReactRouter();
  const {formatMessage: _} = useIntl();
  const isMacOsWrapper = Runtime.isDesktopApp() && Runtime.isMacOS();
  React.useEffect(() => {
    enterPersonalCreationFlow();
  }, []);

  const pageContent = (
    <ContainerXS
      centerText
      verticalCenter
      style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 428}}
    >
      <H1 center>{_(createPersonalAccountStrings.headLine)}</H1>
      <AccountForm
        onSubmit={() => history.push(ROUTE.VERIFY_EMAIL_CODE)}
        submitText={_(createPersonalAccountStrings.submitButton)}
      />
    </ContainerXS>
  );
  const backArrow = (
    <RouterLink to={isMacOsWrapper ? ROUTE.INDEX : ROUTE.SET_ACCOUNT_TYPE} data-uie-name="go-index">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );
  return (
    <Page>
      <IsMobile>
        <div style={{margin: 16}}>{backArrow}</div>
      </IsMobile>
      {isPersonalFlow ? (
        <Container centerText verticalCenter style={{width: '100%'}}>
          <Columns>
            <IsMobile not>
              <Column style={{display: 'flex'}}>
                <div style={{margin: 'auto'}}>{backArrow}</div>
              </Column>
            </IsMobile>
            <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>{pageContent}</Column>
            <Column />
          </Columns>
        </Container>
      ) : (
        pageContent
      )}
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  isPersonalFlow: AuthSelector.isPersonalFlow(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      enterPersonalCreationFlow: ROOT_ACTIONS.authAction.enterPersonalCreationFlow,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(CreatePersonalAccount);
