/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import React, {useState} from 'react';

import {
  useMatchMedia,
  QUERY,
  Button,
  Column,
  Columns,
  Container,
  ContainerXS,
  H2,
  Link,
  LinkVariant,
  Muted,
  Form,
  Input,
  Loading,
  Checkbox,
} from '@wireapp/react-ui-kit';

import {Config} from 'src/script/Config';
import {t} from 'Util/LocalizerUtil';

import {parseValidationErrors, parseError} from '../util/errorUtil';

interface IsLoggedInColumnProps {
  selfName: string;
  handleSubmit: () => void;
  handleLogout: () => void;
}

interface GuestLoginColumnProps {
  enteredName: string;
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  checkNameValidity: (event: React.FormEvent) => Promise<void>;
  isValidName: boolean;
  isSubmitingName: boolean;
  nameInput: React.RefObject<HTMLInputElement>;
  conversationError: (Error & {label?: string | undefined}) | null;
  error: any;
}

const Separator = () => {
  const isMobile = useMatchMedia(QUERY.mobile);
  const Line = () => (
    <div
      style={{
        flex: 1,
        height: '1px',
        backgroundColor: '#696c6e',
        minWidth: '20rem',
      }}
    ></div>
  );
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        maxWidth: `${!isMobile ? '4rem' : '100%'}`,
        justifyContent: 'center',
        transform: `rotate(${!isMobile ? '90' : '0'}deg)`,
        marginLeft: `${!isMobile ? '' : '16px'}`,
      }}
    >
      <Line />
    </div>
  );
};

const IsLoggedInColumn = ({handleLogout, handleSubmit, selfName}: IsLoggedInColumnProps) => {
  return (
    <Container centerText verticalCenter style={{width: '100%', display: 'flex'}}>
      <Columns style={{justifyContent: 'center'}}>
        <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
          <ContainerXS
            centerText
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <>
              <H2 center>{t('conversationJoin.existentAccountJoinInBrowser')}</H2>
              <Muted style={{marginBottom: '1rem'}}>{t('conversationJoin.existentAccountUserName', {selfName})}</Muted>

              <Button
                block
                type="submit"
                formNoValidate
                onClick={() => handleSubmit()}
                aria-label={t('conversationJoin.join')}
                data-uie-name="do-join-as-member"
              >
                {t('conversationJoin.join')}
              </Button>
              <Link
                variant={LinkVariant.PRIMARY}
                block
                onClick={handleLogout}
                textTransform={'none'}
                style={{fontSize: '1rem'}}
                data-uie-name="go-logout"
              >
                {t('conversationJoin.joinWithOtherAccount')}
              </Link>
            </>
          </ContainerXS>
        </Column>
      </Columns>
    </Container>
  );
};

const GuestLoginColumn = ({
  enteredName,
  nameInput,
  onNameChange,
  isSubmitingName,
  isValidName,
  checkNameValidity,
  conversationError,
  error,
}: GuestLoginColumnProps) => {
  const [isTermOfUseAccepted, setIsTermOfUseAccepted] = useState(false);

  return (
    <Container centerText verticalCenter style={{width: '100%'}}>
      <Columns style={{justifyContent: 'center'}}>
        <Column style={{flexBasis: 384, flexGrow: 0, padding: 0}}>
          <ContainerXS
            centerText
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <>
              <H2 center>{t('conversationJoin.noAccountHead')}</H2>
              <Muted>{t('conversationJoin.subhead')}</Muted>
              <Form style={{marginTop: 30}}>
                <Input
                  id="enter-name"
                  name="name"
                  autoComplete="username"
                  value={enteredName}
                  ref={nameInput}
                  onChange={onNameChange}
                  placeholder={t('conversationJoin.namePlaceholder')}
                  maxLength={64}
                  minLength={2}
                  pattern=".{2,64}"
                  required
                  data-uie-name="enter-name"
                  wrapperCSS={{marginBottom: 0}}
                />

                <Checkbox
                  checked={isTermOfUseAccepted}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setIsTermOfUseAccepted(event.target.checked);
                  }}
                  id="do-accept-terms"
                  data-uie-name="do-accept-terms"
                  wrapperCSS={{
                    margin: '1rem 0',
                  }}
                >
                  <span className="subline">
                    {t('conversationJoin.termsAcceptanceText')}{' '}
                    <Link
                      href={Config.getConfig().URL.TERMS_OF_USE_TEAMS}
                      css={{
                        textTransform: 'none',
                        fontSize: 'var(--font-size-base)',
                        fontWeight: 'var(--font-weight-regular)',
                      }}
                      targetBlank
                    >
                      <span
                        css={{
                          color: 'var(--accent-color)',
                        }}
                      >
                        {t('conversationJoin.termsLink', {brandName: Config.getConfig().BRAND_NAME})}
                      </span>
                    </Link>
                    .
                  </span>
                </Checkbox>
                {error ? parseValidationErrors(error) : parseError(conversationError)}
                {isSubmitingName ? (
                  <Loading size={32} />
                ) : (
                  <Button
                    block
                    type="submit"
                    disabled={!enteredName || !isValidName || isSubmitingName || !isTermOfUseAccepted}
                    formNoValidate
                    onClick={checkNameValidity}
                    aria-label={t('conversationJoin.joinButton')}
                    data-uie-name="do-join-as-guest"
                  >
                    {t('conversationJoin.joinButton')}
                  </Button>
                )}
              </Form>
            </>
          </ContainerXS>
        </Column>
      </Columns>
    </Container>
  );
};

export {IsLoggedInColumn, Separator, GuestLoginColumn};
