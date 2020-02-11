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

import {
  ArrowIcon,
  COLOR,
  Column,
  Columns,
  Container,
  ContainerXS,
  Form,
  H1,
  Input,
  InputSubmitCombo,
  IsMobile,
  Link,
  Muted,
  RoundIconButton,
} from '@wireapp/react-ui-kit';
import React, {useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {connect} from 'react-redux';
import {AnyAction, Dispatch} from 'redux';
import useReactRouter from 'use-react-router';
import {getLogger} from 'Util/Logger';
import {addLocaleToUrl} from '../../externalRoute';
import {teamNameStrings} from '../../strings';
import RouterLink from '../component/RouterLink';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';
import Page from './Page';

interface Props extends React.HTMLProps<HTMLDivElement> {}

const TeamName = ({
  teamName,
  enterTeamCreationFlow,
  resetInviteErrors,
  pushAccountRegistrationData,
  authError,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('TeamName');

  const {formatMessage: _} = useIntl();
  const {history} = useReactRouter();
  const [enteredTeamName, setEnteredTeamName] = useState(teamName || '');
  const [error, setError] = useState(null);
  const [isValidTeamName, setIsValidTeamName] = useState(!!teamName);
  const teamNameInput = useRef<HTMLInputElement>();

  useEffect(() => {
    enterTeamCreationFlow();
  }, []);

  const resetErrors = () => {
    setError(null);
    setIsValidTeamName(true);
    resetInviteErrors();
  };
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    teamNameInput.current.value = teamNameInput.current.value.trim();
    if (!teamNameInput.current.checkValidity()) {
      setError(ValidationError.handleValidationState('name', teamNameInput.current.validity));
      setIsValidTeamName(false);
    } else {
      try {
        await pushAccountRegistrationData({
          team: {
            binding: undefined,
            creator: undefined,
            icon: undefined,
            id: undefined,
            name: teamNameInput.current.value,
          },
        });
        return history.push(ROUTE.CREATE_TEAM_ACCOUNT);
      } catch (error) {
        logger.error('Unable to push account data', error);
      }
    }
    teamNameInput.current.focus();
  };

  const backArrow = (
    <RouterLink to={ROUTE.SET_ACCOUNT_TYPE} data-uie-name="go-register-team">
      <ArrowIcon direction="left" color={COLOR.TEXT} style={{opacity: 0.56}} />
    </RouterLink>
  );

  return (
    <Page>
      <IsMobile>
        <div style={{margin: 16}}>{backArrow}</div>
      </IsMobile>
      <Container centerText verticalCenter style={{width: '100%'}}>
        <Columns>
          <IsMobile not>
            <Column style={{display: 'flex'}}>
              <div style={{margin: 'auto'}}>{backArrow}</div>
            </Column>
          </IsMobile>
          <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
            <ContainerXS
              centerText
              style={{display: 'flex', flexDirection: 'column', height: 428, justifyContent: 'space-between'}}
            >
              <div>
                <H1 center>{_(teamNameStrings.headline)}</H1>
                <Muted>{_(teamNameStrings.subhead)}</Muted>
                <Form style={{marginTop: 30}}>
                  <InputSubmitCombo>
                    <Input
                      value={enteredTeamName}
                      ref={teamNameInput}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        resetErrors();
                        setEnteredTeamName(event.target.value);
                      }}
                      placeholder={_(teamNameStrings.teamNamePlaceholder)}
                      pattern=".{2,256}"
                      maxLength={256}
                      minLength={2}
                      required
                      autoFocus
                      data-uie-name="enter-team-name"
                    />
                    <RoundIconButton
                      disabled={!enteredTeamName || !isValidTeamName}
                      type="submit"
                      formNoValidate
                      onClick={handleSubmit}
                      data-uie-name="do-next"
                    >
                      <ArrowIcon />
                    </RoundIconButton>
                  </InputSubmitCombo>
                  {error ? parseValidationErrors(error) : parseError(authError)}
                </Form>
              </div>
              <div>
                <Link
                  href={addLocaleToUrl(EXTERNAL_ROUTE.WIRE_TEAM_FEATURES)}
                  target="_blank"
                  data-uie-name="go-what-is"
                >
                  {_(teamNameStrings.whatIsWireTeamsLink)}
                </Link>
              </div>
            </ContainerXS>
          </Column>
          <Column />
        </Columns>
      </Container>
    </Page>
  );
};

type ConnectedProps = ReturnType<typeof mapStateToProps>;
const mapStateToProps = (state: RootState) => ({
  authError: AuthSelector.getError(state),
  teamName: AuthSelector.getAccountTeamName(state),
});

type DispatchProps = ReturnType<typeof mapDispatchToProps>;
const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) =>
  bindActionCreators(
    {
      enterTeamCreationFlow: ROOT_ACTIONS.authAction.enterTeamCreationFlow,
      pushAccountRegistrationData: ROOT_ACTIONS.authAction.pushAccountRegistrationData,
      resetInviteErrors: ROOT_ACTIONS.invitationAction.resetInviteErrors,
    },
    dispatch,
  );

export default connect(mapStateToProps, mapDispatchToProps)(TeamName);
