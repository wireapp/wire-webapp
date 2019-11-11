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

import {LoginData} from '@wireapp/api-client/dist/commonjs/auth';
import {ICON_NAME, Input, InputBlock, InputSubmitCombo, Loading, RoundIconButton, Select} from '@wireapp/react-ui-kit';
import React, {useRef, useState} from 'react';

import {COUNTRY_CODES, getCountryByCode, getCountryCode} from 'Util/CountryCodes';

interface LoginFormProps {
  isFetching: boolean;
  onSubmit: (loginData: Partial<LoginData>, validationErrors: Error[]) => Promise<void>;
}

const PhoneLoginForm = ({isFetching, onSubmit}: LoginFormProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('1');
  const [country, setCountry] = useState('US');
  const [validInput, setValidInput] = useState(true);
  const phoneInput = useRef();
  const countryCodeInput = useRef();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isFetching) {
      return;
    }
    onSubmit({phone: `+${countryCode}${phoneNumber}`}, []);
  };

  return (
    <InputBlock>
      <Select
        tabIndex={1}
        style={{marginBottom: 0, height: 57}}
        value={country}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          const {value} = event.target;
          setCountry(value);
          setCountryCode((getCountryCode(value) || 'X2').toString(10));
        }}
      >
        <option value="X0" style={{display: 'none'}}>
          authAccountCountryCode
        </option>
        <option value="X1" style={{display: 'none'}}>
          authErrorCountryCodeInvalid
        </option>
        {COUNTRY_CODES.map(({iso, name}) => (
          <option key={iso} value={iso}>
            {name}
          </option>
        ))}
      </Select>
      <InputSubmitCombo style={{background: 'none', boxShadow: 'inset 16px 16px 0 #fff, inset -100px -16px 0 #fff'}}>
        <Input
          tabIndex={2}
          style={{width: 80, marginRight: 1}}
          ref={countryCodeInput}
          value={`+${countryCode}`}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const {value} = event.target;
            const codeNumbers = value.replace(/\D/g, '');
            setCountryCode(codeNumbers);
            setCountry(codeNumbers ? getCountryByCode(codeNumbers) || 'X1' : 'X0');
          }}
        />
        <Input
          name="password-login"
          tabIndex={3}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPhoneNumber(event.target.value);
            setValidInput(true);
          }}
          ref={phoneInput}
          markInvalid={!validInput}
          value={phoneNumber}
          autoComplete="section-login password"
          pattern={`.{1,1024}`}
          type="tel"
          required
          placeholder="phone number"
          data-uie-name="enter-password"
        />
        {isFetching ? (
          <Loading size={32} />
        ) : (
          <RoundIconButton
            style={{marginLeft: 16}}
            tabIndex={4}
            disabled={!phoneNumber}
            type="submit"
            formNoValidate
            icon={ICON_NAME.ARROW}
            onClick={handleSubmit}
            data-uie-name="do-sign-in"
          />
        )}
      </InputSubmitCombo>
    </InputBlock>
  );
};
export default PhoneLoginForm;
