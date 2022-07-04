/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {CSS_SQUARE} from 'Util/CSSMixin';
import {t} from 'Util/LocalizerUtil';
import {CSSObject} from '@emotion/serialize';
import {User} from '../entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ACCENT_ID} from '../Config';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const headerStyles: CSSObject = {
  lineHeight: '14px',
  margin: '20px 0 6px',
  padding: 0,
  textAlign: 'center',
  textTransform: 'uppercase',
};

const AccentColorPicker: React.FunctionComponent<AccentColorPickerProps> = ({user, doSetAccentColor}) => {
  const {accent_id: accentId} = useKoSubscribableChildren(user, ['accent_id']);
  return (
    <>
      <h3 className="label" css={headerStyles}>
        {t('preferencesAccountAccentColor')}
      </h3>
      <fieldset css={{border: 'none', margin: 0, padding: 0}} aria-label={t('accessibility.chooseAccountColor')}>
        <div
          className="preferences-account-accent-color"
          css={{
            alignItems: 'center',
            display: 'inline-flex',
            justifyContent: 'space-between',
          }}
        >
          {(Object.keys(ACCENT_ID) as (keyof typeof ACCENT_ID)[]).map(key => {
            const id = ACCENT_ID[key];
            const name = t(`preferencesAccountAccentColor${key}`);
            const color = User.ACCENT_COLOR[id];
            const isChecked = accentId === id;

            return (
              <div data-uie-name="element-accent-color-label" data-uie-value={id} key={id}>
                <input
                  id={String(id)}
                  type="radio"
                  name="accent"
                  checked={isChecked}
                  onChange={() => doSetAccentColor(id)}
                  data-uie-name="do-set-accent-color"
                  data-uie-value={id}
                  css={{
                    '& + label > span:first-child': {
                      color: color,
                      cursor: 'pointer',
                      display: 'inline-block',
                      position: 'relative',
                    },
                    '& + label > span:first-child::after': {
                      ...CSS_SQUARE(10),
                      background: 'currentColor',
                      left: '-5px',
                      top: '-5px',
                    },
                    '& + label > span:first-child::before': {
                      ...CSS_SQUARE(16),
                      left: '-8px',
                      top: '-8px',
                    },
                    '& + label > span:first-child::before, & + label > span:first-child::after': {
                      borderRadius: '50%',
                      content: '""',
                      display: 'inline-block',
                      position: 'absolute',
                      transition: 'all 0.15s ease-out',
                    },
                    '&:checked + label > span:first-child::after': {
                      left: '-5px',
                      top: '-5px',
                    },
                    '&:checked + label > span:first-child::before': {
                      border: '1px solid currentColor',
                    },
                    '&:focus + label > span:first-child::before': {
                      ...CSS_SQUARE(16),
                      outline: '1px solid Highlight',
                    },
                    opacity: 0,
                  }}
                />
                <label
                  htmlFor={String(id)}
                  style={{
                    alignItems: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <span />
                  <span
                    style={{
                      fontSize: '11px',
                      marginTop: '14px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {name}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>
    </>
  );
};

export default AccentColorPicker;
