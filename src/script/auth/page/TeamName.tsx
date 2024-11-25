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

import React, {useEffect, useRef, useState} from 'react';

import {connect} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {AnyAction, Dispatch} from 'redux';

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
  InputBlock,
  InputSubmitCombo,
  IsMobile,
  Link,
  Muted,
  RoundIconButton,
} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {Page} from './Page';

import {addLocaleToUrl} from '../../externalRoute';
import {RouterLink} from '../component/RouterLink';
import {EXTERNAL_ROUTE} from '../externalRoute';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {ValidationError} from '../module/action/ValidationError';
import {RootState, bindActionCreators} from '../module/reducer';
import * as AuthSelector from '../module/selector/AuthSelector';
import {ROUTE} from '../route';
import {parseError, parseValidationErrors} from '../util/errorUtil';

type Props = React.HTMLProps<HTMLDivElement>;

const TeamNameComponent = ({
  teamName,
  enterTeamCreationFlow,
  resetInviteErrors,
  pushAccountRegistrationData,
  authError,
}: Props & ConnectedProps & DispatchProps) => {
  const logger = getLogger('TeamName');

  const navigate = useNavigate();
  const [enteredTeamName, setEnteredTeamName] = useState(teamName || '');
  const [error, setError] = useState<ValidationError | null>(null);
  const [isValidTeamName, setIsValidTeamName] = useState(!!teamName);
  const teamNameInput = useRef<HTMLInputElement | null>(null);

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

    if (!teamNameInput.current) {
      return;
    }

    teamNameInput.current.value = teamNameInput.current.value.trim();

    if (!teamNameInput.current.checkValidity()) {
      setError(ValidationError.handleValidationState('name', teamNameInput.current.validity));
      setIsValidTeamName(false);
    } else {
      try {
        await pushAccountRegistrationData({
          team: {
            creator: '',
            icon: '',
            id: '',
            name: teamNameInput.current.value,
          },
        });
        return navigate(ROUTE.CREATE_TEAM_ACCOUNT);
      } catch (error) {
        logger.error('Unable to push account data', error);
      }
    }

    teamNameInput.current.focus();
  };

  const onTeamNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetErrors();
    setEnteredTeamName(event.target.value);
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
                <H1 center>{t('teamName.headline')}</H1>
                <Muted>{t('teamName.subhead')}</Muted>
                <Form style={{marginTop: 30}}>
                  <InputBlock>
                    <InputSubmitCombo>
                      <Input
                        id="enter-team-name"
                        value={enteredTeamName}
                        ref={teamNameInput}
                        onChange={onTeamNameChange}
                        placeholder={t('teamName.teamNamePlaceholder')}
                        pattern=".{2,256}"
                        maxLength={256}
                        minLength={2}
                        required
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
                  </InputBlock>
                  {error ? parseValidationErrors(error) : parseError(authError)}
                </Form>
              </div>
              <div>
                <Link
                  href={addLocaleToUrl(EXTERNAL_ROUTE.WIRE_TEAM_FEATURES)}
                  target="_blank"
                  data-uie-name="go-what-is"
                >
                  {t('teamName.whatIsWireTeamsLink')}
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

const TeamName = connect(mapStateToProps, mapDispatchToProps)(TeamNameComponent);

export {TeamName};
