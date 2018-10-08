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

import {Button, Column, Columns, Container, H3, Modal, Text} from '@wireapp/react-ui-kit';
import * as React from 'react';
import {InjectedIntlProps, injectIntl} from 'react-intl';
import {connect} from 'react-redux';
import {appAlreadyOpenStrings} from '../../strings';
import ROOT_ACTIONS from '../module/action/';
import {RootState, ThunkDispatch} from '../module/reducer';
import * as CookieSelector from '../module/selector/CookieSelector';

export interface Props extends React.HTMLAttributes<AppAlreadyOpen> {
  fullscreen?: boolean;
}

interface ConnectedProps {
  isAppAlreadyOpen: boolean;
}

interface DispatchProps {
  removeCookie: (name: string) => Promise<void>;
}

class AppAlreadyOpen extends React.Component<Props & ConnectedProps & DispatchProps & InjectedIntlProps> {
  onContinue = () => {
    this.props.removeCookie(CookieSelector.COOKIE_NAME_APP_OPENED);
  };

  render = () => {
    const {
      isAppAlreadyOpen,
      fullscreen,
      intl: {formatMessage: _},
    } = this.props;
    return (
      isAppAlreadyOpen && (
        <Modal fullscreen={fullscreen}>
          <Container style={{maxWidth: '320px'}} data-uie-name="modal-already-open">
            <H3 style={{fontWeight: 500, marginTop: '10px'}} data-uie-name="status-modal-title">
              {_(appAlreadyOpenStrings.headline)}
            </H3>
            <Text data-uie-name="status-modal-text">{_(appAlreadyOpenStrings.text)}</Text>
            <Columns style={{marginTop: '20px'}}>
              <Column style={{textAlign: 'center'}}>
                <Button block onClick={this.onContinue} style={{marginBottom: '10px'}} data-uie-name="do-action">
                  {_(appAlreadyOpenStrings.continueButton)}
                </Button>
              </Column>
            </Columns>
          </Container>
        </Modal>
      )
    );
  };
}

export default injectIntl(
  connect(
    (state: RootState): ConnectedProps => {
      return {
        isAppAlreadyOpen: CookieSelector.isAppAlreadyOpen(state),
      };
    },
    (dispatch: ThunkDispatch): DispatchProps => {
      return {
        removeCookie: (name: string) => dispatch(ROOT_ACTIONS.cookieAction.removeCookie(name)),
      };
    }
  )(AppAlreadyOpen)
);
