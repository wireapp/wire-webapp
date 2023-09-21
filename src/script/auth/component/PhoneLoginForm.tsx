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

import React, {useRef, useState} from 'react';

import {LoginData} from '@wireapp/api-client/lib/auth';
import {useIntl} from 'react-intl';

import {
  ArrowIcon,
  Input,
  InputBlock,
  InputSubmitCombo,
  Loading,
  RoundIconButton,
  Select,
  QUERY,
  useMatchMedia,
} from '@wireapp/react-ui-kit';

import {COUNTRY_CODES, getCountryByCode, getCountryCode} from 'Util/CountryCodes';

import {phoneLoginStrings} from '../../strings';

interface LoginFormProps {
  isFetching: boolean;
  onSubmit: (loginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

function PhoneLoginForm({isFetching, onSubmit}: LoginFormProps) {
  const {formatMessage: _} = useIntl();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('1');
  const [country, setCountry] = useState('US');
  const [validInput, setValidInput] = useState(true);
  const phoneInput = useRef(null);
  const countryCodeInput = useRef(null);
  const countryList = COUNTRY_CODES.map(({iso, name}) => ({
    label: name,
    value: iso,
  }));
  const expandedCountryList = [
    {label: _(phoneLoginStrings.accountCountryCode), value: 'X0'},
    {label: _(phoneLoginStrings.errorCountryCodeInvalid), value: 'X1'},
    ...countryList,
  ];
  const currentSelectValue = expandedCountryList.find(selectedCountry => selectedCountry.value === country);

  const isTiny = useMatchMedia('max-width: 480px');
  const isMobile = useMatchMedia(QUERY.mobile);

  const onCountryCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const {value} = event.target;
    const codeNumbers = value.replace(/\D/g, '');
    setCountryCode(codeNumbers);
    setCountry(codeNumbers ? getCountryByCode(codeNumbers) || 'X1' : 'X0');
  };

  const onPhoneNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(event.target.value);
    setValidInput(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isFetching) {
      return;
    }
    onSubmit({phone: `+${countryCode}${phoneNumber}`}, []);
  };

  return (
    <div>
      <Select
        id="select-phone"
        onChange={country => {
          const selectedCountryValue = country?.value.toString();

          if (selectedCountryValue) {
            setCountry(selectedCountryValue);
            setCountryCode((getCountryCode(selectedCountryValue) || 'X2').toString(10));
          }
        }}
        dataUieName="select-phone"
        options={expandedCountryList}
        value={currentSelectValue}
      />

      <InputBlock>
        <InputSubmitCombo style={{background: 'none', boxShadow: 'inset 16px 16px 0 #fff, inset -100px -16px 0 #fff'}}>
          <Input
            id="enter-country-code"
            ref={countryCodeInput}
            value={`+${countryCode}`}
            onChange={onCountryCodeChange}
            data-uie-name="enter-country-code"
          />
          <Input
            id="enter-phone"
            name="phone-login"
            onChange={onPhoneNumberChange}
            style={{width: isTiny ? 'calc(100vw - 200px)' : isMobile ? 'calc(100vw - 250px)' : '280px'}}
            ref={phoneInput}
            markInvalid={!validInput}
            value={phoneNumber}
            autoComplete="section-login phone"
            pattern=".{1,1024}"
            type="tel"
            required
            placeholder="phone number"
            data-uie-name="enter-phone"
          />
          {isFetching ? (
            <Loading size={32} />
          ) : (
            <RoundIconButton
              disabled={!phoneNumber}
              type="submit"
              formNoValidate
              onClick={handleSubmit}
              data-uie-name="do-sign-in-phone"
            >
              <ArrowIcon />
            </RoundIconButton>
          )}
        </InputSubmitCombo>
      </InputBlock>
    </div>
  );
}
export {PhoneLoginForm};
