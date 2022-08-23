/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

/** @jsx jsx */
import {jsx} from '@emotion/react';
import React from 'react';
import {components, OptionProps, ValueContainerProps} from 'react-select';
import {MenuProps} from 'react-select/dist/declarations/src/components/Menu';
import {IndicatorsContainerProps} from 'react-select/dist/declarations/src/components/containers';

import {Theme} from '../Layout';
import {Option} from './Select';
import {ArrowDown} from '../Icon/ArrowDown';
// SelectContainer
export const SelectContainer = props => {
  return (
    <components.SelectContainer {...props}>
      <div tabIndex={0}>{props.children}</div>
    </components.SelectContainer>
  );
};

export const DropdownIndicator = props => {
  const {menuIsOpen} = props.selectProps;

  return (
    <components.DropdownIndicator {...props}>
      {/* MarginTop for center arrow */}
      <ArrowDown css={{...(menuIsOpen ? {transform: 'rotateX(180deg)', marginTop: 2} : {marginTop: 4})}} />
    </components.DropdownIndicator>
  );
};

// eslint-disable-next-line react/display-name
export const CustomOption = (dataUieName: string) => (props: OptionProps<Option>) => {
  const {children, data, isFocused, isMulti, isSelected, options} = props;

  return (
    <components.Option {...props}>
      <div
        css={{
          ...(isMulti && {
            display: 'grid',
            gridTemplateAreas: `"checkbox label"
                                ". description"`,
            gridTemplateColumns: '22px 1fr',
            columnGap: '10px',
          }),
        }}
        {...(dataUieName && {
          'data-uie-name': `option-${dataUieName}`,
          'data-uie-value': (options as Option[]).find(option => option.label === children)?.value,
        })}
      >
        {isMulti && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => null}
            css={{gridArea: 'checkbox', width: 22, height: 22, cursor: 'pointer', placeSelf: 'center'}}
          />
        )}

        <div css={{gridArea: 'label', overflowWrap: 'break-word', overflow: 'hidden'}}>{children}</div>

        {data && data.description && (
          <p
            css={(theme: Theme) => ({
              marginBottom: 0,
              fontSize: '14px',
              color: isSelected ? theme.Select.focusedDescriptionColor : theme.Input.labelColor,
              gridArea: 'description',
            })}
          >
            {data.description}
          </p>
        )}
      </div>
    </components.Option>
  );
};

// eslint-disable-next-line react/display-name
export const Menu = (dataUieName: string) => (props: MenuProps) => {
  const {children} = props;

  return (
    <components.Menu {...props}>
      <div
        {...(dataUieName && {
          'data-uie-name': `dropdown-${dataUieName}`,
        })}
      >
        {children}
      </div>
    </components.Menu>
  );
};

export const renderValue = value => {
  if (Array.isArray(value)) {
    const currentValue = (i: number) => value[i].props.children;

    return (
      <div
        css={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          paddingRight: 14,
          gridArea: '1/1/2/3',
        }}
      >
        {currentValue(0)}
      </div>
    );
  }

  return value;
};

export const ValueContainer = ({children, ...restProps}: ValueContainerProps<Option>) => (
  <components.ValueContainer {...restProps}>
    {renderValue(children[0])} {children[1]}
  </components.ValueContainer>
);

export const IndicatorsContainer = ({children, ...restProps}: IndicatorsContainerProps<Option>) => {
  const value = restProps.getValue();
  const displaySelectedOptionsCount = Array.isArray(value) && value.length > 1;

  return (
    <components.IndicatorsContainer {...restProps}>
      {displaySelectedOptionsCount && <div css={{fontWeight: 600}}>(+{value.length - 1})</div>}

      {children}
    </components.IndicatorsContainer>
  );
};
