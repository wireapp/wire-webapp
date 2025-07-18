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

import {CSSObject} from '@emotion/serialize';

import {User} from 'Repositories/entity/User';
import {ACCENT_ID} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {CSS_SQUARE} from 'Util/CSSMixin';
import {t} from 'Util/LocalizerUtil';

export interface AccentColorPickerProps {
  doSetAccentColor: (id: number) => void;
  user: User;
}

const headerStyles: CSSObject = {
  lineHeight: 'var(--line-height-small-plus)',
  margin: '20px 0 6px',
  padding: 0,
  textAlign: 'center',
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
                    '& + label > span:first-of-type': {
                      color: color,
                      cursor: 'pointer',
                      display: 'inline-block',
                      position: 'relative',
                    },
                    '& + label > span:first-of-type::after': {
                      ...CSS_SQUARE(10),
                      background: 'currentColor',
                      transform: 'translate(-50%, -50%)',
                    },
                    '& + label > span:first-of-type::before': {
                      ...CSS_SQUARE(16),
                      transform: 'translate(-50%, -50%)',
                    },
                    '& + label > span:first-of-type::before, & + label > span:first-of-type::after': {
                      borderRadius: '50%',
                      content: '""',
                      display: 'inline-block',
                      position: 'absolute',
                      transition: 'all 0.15s ease-out',
                    },
                    '&:checked + label > span:first-of-type::before': {
                      border: '1px solid currentColor',
                    },
                    '&:focus-visible + label': {
                      backgroundColor: 'var(--gray-20)',
                      'body.theme-dark &': {
                        backgroundColor: 'var(--gray-90)',
                      },
                      boxShadow: 'inset 0 0 0 1px var(--accent-color-focus)',
                    },
                    '&:hover + label': {
                      backgroundColor: 'var(--gray-20)',
                      'body.theme-dark &': {
                        backgroundColor: 'var(--gray-90)',
                      },
                    },
                    opacity: 0,
                    position: 'absolute',
                  }}
                />
                <label
                  htmlFor={String(id)}
                  style={{
                    alignItems: 'center',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: '50px',
                    paddingTop: '10px',
                  }}
                >
                  <span />
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      marginTop: '14px',
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

export {AccentColorPicker};
