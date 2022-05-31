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

/** @jsx jsx */
import {CSSObject, jsx} from '@emotion/react';

import {COLOR_V2} from '../Identity';
import type {Theme} from '../Layout';
import {filterProps, inlineSVG} from '../util';
import {inputStyle} from './Input';
import React, {ReactElement, useEffect, useRef, useState} from 'react';
import InputLabel from './InputLabel';

type Option = {
  value: string | number;
  label: string;
};

export interface SelectProps {
  id: string;
  onChange: (selectedOption: string | number) => void;
  dataUieName: string;
  options: Option[];
  value?: Option | null;
  helperText?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  markInvalid?: boolean;
  error?: ReactElement;
}

const ArrowDown = (theme: Theme) => `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <path fill="${theme.general.color}" fill-rule="evenodd" clip-rule="evenodd" d="M7.99963 12.5711L15.6565 4.91421L14.2423 3.5L7.99963 9.74264L1.75699 3.5L0.342773 4.91421L7.99963 12.5711Z"/>
    </svg>
`;

export const selectStyle: <T>(theme: Theme, props, error?: boolean) => CSSObject = (
  theme,
  {disabled = false, markInvalid, ...props},
  error = false,
) => ({
  ...inputStyle(theme, props),
  '&:-moz-focusring': {
    color: 'transparent',
    textShadow: '0 0 0 #000',
  },
  '&:disabled': {
    color: COLOR_V2.GRAY,
  },
  appearance: 'none',
  background: disabled
    ? `${theme.Input.backgroundColorDisabled} center right 16px no-repeat url("${inlineSVG(ArrowDown(theme))}")`
    : `${theme.Input.backgroundColor} center right 16px no-repeat url("${inlineSVG(ArrowDown(theme))}")`,
  boxShadow: markInvalid ? `0 0 0 1px ${COLOR_V2.RED}` : `0 0 0 1px ${COLOR_V2.GRAY_40}`,
  cursor: disabled ? 'normal' : 'pointer',
  fontSize: '16px',
  fontWeight: 300,
  paddingRight: '30px',
  textAlign: 'left',
  marginBottom: error && '8px',
  '&:invalid, option:first-of-type': {
    color: COLOR_V2.RED,
  },
  ...(!disabled && {
    '&:hover': {
      boxShadow: `0 0 0 1px ${COLOR_V2.GRAY_60}`,
    },
    '&:focus, &:active': {
      boxShadow: `0 0 0 1px ${COLOR_V2.BLUE}`,
    },
  }),
});

const dropdownStyles = (theme: Theme, isDropdownOpen: boolean): CSSObject => ({
  height: isDropdownOpen ? 'auto' : 0,
  visibility: isDropdownOpen ? 'visible' : 'hidden',
  margin: '3px 0 0',
  padding: 0,
  borderRadius: '10px',
  border: `1px solid ${COLOR_V2.BLUE}`,
  position: 'absolute',
  top: '100%',
  left: 0,
  width: '100%',
  zIndex: 9,
});

const dropdownOptionStyles = (theme: Theme, isSelected: boolean): CSSObject => ({
  background: isSelected ? COLOR_V2.BLUE : COLOR_V2.WHITE,
  listStyle: 'none',
  padding: '10px 20px 14px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: 300,
  lineHeight: '24px',
  letterSpacing: '0.05px',
  color: isSelected ? COLOR_V2.WHITE : COLOR_V2.BLACK,
  '&:first-of-type': {
    borderRadius: '10px 10px 0 0',
  },
  '&:last-of-type': {
    borderRadius: '0 0 10px 10px',
  },
  '&:not(:last-of-type)': {
    borderBottom: `1px solid ${COLOR_V2.GRAY_40}`,
  },
  '&:hover, &:active, &:focus': {
    background: COLOR_V2.BLUE,
    borderColor: COLOR_V2.BLUE,
    color: COLOR_V2.WHITE,
  },
});

const filterSelectProps = props => filterProps(props, ['markInvalid']);

const placeholderText = '- Please select -';

export const Select = ({
  id,
  label,
  error,
  helperText,
  options = [],
  value = null,
  onChange,
  required,
  markInvalid,
  dataUieName,
  ...props
}: SelectProps) => {
  const selectContainerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(() => (value ? options.indexOf(value) : null));

  const onToggleDropdown = () => setIsDropdownOpen(prevState => !prevState);

  const onOptionSelect = (idx: number) => {
    setSelectedOption(idx);
    onChange(options[idx].value);
  };

  const onOptionChange = (idx: number) => {
    onOptionSelect(idx);
    setIsDropdownOpen(false);
  };

  const handleListKeyDown = e => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
        }

        e.preventDefault();
        onOptionSelect(selectedOption - 1 >= 0 ? selectedOption - 1 : options.length - 1);
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
        }

        e.preventDefault();
        if (selectedOption === null) {
          onOptionSelect(0);
        } else {
          onOptionSelect(selectedOption === options.length - 1 ? 0 : selectedOption + 1);
        }
        break;
      default:
        break;
    }
  };

  const handleKeyDown = index => e => {
    switch (e.key) {
      case ' ':
      case 'SpaceBar':
      case 'Enter':
        e.preventDefault();
        onOptionChange(index);
        break;
      default:
        break;
    }
  };

  const hasError = !!error;

  const hasSelectedOption = options && !!options[selectedOption];

  const handleOutsideClick = (event: MouseEvent) => {
    if (selectContainerRef.current && !selectContainerRef.current.contains(event.target as Node)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div
      css={{
        marginBottom: markInvalid ? '2px' : '20px',
        '&:focus-within label': {
          color: COLOR_V2.BLUE,
        },
      }}
      data-uie-name={dataUieName}
      ref={selectContainerRef}
    >
      {label && (
        <InputLabel htmlFor={id} isRequired={required} markInvalid={markInvalid}>
          {label}
        </InputLabel>
      )}

      <div css={{position: 'relative'}}>
        <button
          type="button"
          aria-activedescendant={hasSelectedOption ? options[selectedOption].label : ''}
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-labelledby={id}
          id={id}
          onClick={onToggleDropdown}
          onKeyDown={handleListKeyDown}
          css={(theme: Theme) => selectStyle(theme, props, hasError)}
          {...filterSelectProps(props)}
          data-uie-name={dataUieName}
        >
          {hasSelectedOption ? options[selectedOption].label : placeholderText}
        </button>

        <ul
          role="listbox"
          aria-labelledby={id}
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
          css={(theme: Theme) => dropdownStyles(theme, isDropdownOpen)}
          {...(dataUieName && {
            'data-uie-name': `dropdown-${dataUieName}`,
          })}
        >
          {options.map((option, index) => {
            const isSelected = selectedOption == index;

            return (
              <li
                key={option.value}
                id={option.value.toString()}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onKeyDown={handleKeyDown(index)}
                onClick={() => onOptionChange(index)}
                css={(theme: Theme) => dropdownOptionStyles(theme, isSelected)}
                {...(dataUieName && {
                  'data-uie-name': `option-${dataUieName}`,
                  'data-uie-value': option.label,
                })}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      </div>

      {!hasError && helperText && (
        <p css={{fontSize: '12px', fontWeight: 400, color: COLOR_V2.GRAY_80, marginTop: 8}}>{helperText}</p>
      )}

      {error}
    </div>
  );
};
