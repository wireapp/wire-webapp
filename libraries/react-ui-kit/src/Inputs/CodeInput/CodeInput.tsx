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

import {useEffect, useState} from 'react';
import * as React from 'react';

import {CSSObject} from '@emotion/react';

import {COLOR_V2} from '../../Identity';
import {Theme} from '../../Identity/Theme';
import {noop} from '../../utils/util';
import {InputProps, inputStyle} from '../Input';

const CodeInputWrapper = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={{
      display: 'flex',
      justifyContent: 'center',
      flexDirection: 'column',
    }}
    {...props}
  />
);

const codeInputLabelStyle: (theme: Theme) => CSSObject = theme => ({
  color: COLOR_V2.GRAY_70,
  textAlign: 'center',
  marginBottom: '0.5rem',
  fontSize: theme.fontSizes.base,
  fontStyle: 'normal',
  fontWeight: 400,
  lineHeight: '1.5rem',
  letterSpacing: '0.003rem',
});

export type DigitInputProps<T = HTMLInputElement> = InputProps<T>;

const digitInputStyle: <T>(theme: Theme, props: DigitInputProps<T>) => CSSObject = (theme, props) => ({
  ...inputStyle(theme, props),
  '& + &': {
    marginLeft: 'min(19px, 2vw)',
  },
  '&:hover': {
    boxShadow: `0 0 0 1px ${COLOR_V2.GRAY_60}`,
  },
  fontSize: theme.fontSizes.extraLarge,
  lineHeight: '1.75rem',
  borderRadius: '12px',
  padding: 0,
  textAlign: 'center',
  width: 'min(48px, 13vw)',
  height: '56px',
});

const DigitInput = React.forwardRef<HTMLInputElement, DigitInputProps<HTMLInputElement>>((props, ref) => (
  <input ref={ref} css={(theme: Theme) => digitInputStyle(theme, props)} {...props} />
));
DigitInput.displayName = 'DigitInput';
export interface CodeInputProps<T = HTMLInputElement> extends InputProps<T> {
  autoFocus?: boolean;
  digits?: number;
  markInvalid?: boolean;
  onCodeComplete?: (completeCode?: string) => void;
  codeInputLabel?: string;
  codePlaceholder?: string;
}

export const CodeInput = ({
  style,
  digits = 6,
  markInvalid,
  onCodeComplete = noop,
  disabled,
  codeInputLabel,
  codePlaceholder,
}: CodeInputProps) => {
  const [values, setValues] = useState(Array(digits).fill(''));
  const inputs = Array(digits);

  const forceSelection = (
    event:
      | React.MouseEvent<HTMLInputElement>
      | React.TouchEvent<HTMLInputElement>
      | React.KeyboardEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>,
  ) => {
    const target = event.target as HTMLInputElement;
    target.select();
  };

  const forceSelectionPreventDefault = (
    event: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>,
  ) => {
    forceSelection(event);
    event.preventDefault();
  };

  const nextField = (currentFieldIndex: number) => {
    const nextFieldIndex = currentFieldIndex + 1;
    if (nextFieldIndex < digits) {
      inputs[nextFieldIndex].focus();
    }
  };

  const previousField = (currentFieldIndex: number) => {
    if (currentFieldIndex > 0) {
      inputs[currentFieldIndex - 1].focus();
    }
  };

  const setValue = (fieldIndex: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const valuesCopy = values.slice();
      valuesCopy[fieldIndex] = value;
      setValues(valuesCopy);
      if (value.length) {
        nextField(fieldIndex);
      }
    }
  };

  const handleKeyDown = (fieldIndex: number, {key}: React.KeyboardEvent<HTMLInputElement>) => {
    switch (key) {
      case 'Backspace':
        setValue(fieldIndex, '');
        previousField(fieldIndex);
        break;
      case 'ArrowLeft':
        previousField(fieldIndex);
        break;
      case 'ArrowRight':
        nextField(fieldIndex);
        break;
    }
    if (/^[0-9]$/.test(key)) {
      setValue(fieldIndex, key);
    }
  };

  const handlePaste = (fieldIndex: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedValue = event.clipboardData.getData('Text');
    const cleanedPaste = pastedValue.replace(/[^0-9]/g, '');
    if (/^[0-9]+$/.test(cleanedPaste)) {
      setValues(values.slice(0, fieldIndex).concat(cleanedPaste.split('')).slice(0, digits));
    }
  };

  useEffect(() => {
    const completeCode = values.join('');
    if (completeCode.length === digits) {
      onCodeComplete(completeCode);
    }
  }, [values]);

  const labelId = React.useId();
  const getDigitAriaLabel = (value: string) => (value ? `${codePlaceholder}, ${value}` : `${codePlaceholder}`);

  return (
    <CodeInputWrapper role="group" aria-labelledby={labelId} style={style}>
      <span id={labelId} css={codeInputLabelStyle}>
        {codeInputLabel}
      </span>
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'nowrap',
          width: '100%',
        }}
      >
        {Array.from({length: digits}, (_, index) => (
          <DigitInput
            key={index}
            onPaste={event => handlePaste(index, event)}
            onFocus={forceSelection}
            onMouseDown={forceSelectionPreventDefault}
            onTouchStart={forceSelectionPreventDefault}
            onKeyDown={event => handleKeyDown(index, event)}
            onKeyUp={forceSelection}
            markInvalid={markInvalid}
            ref={node => (inputs[index] = node)}
            value={values[index]}
            disabled={disabled}
            id={`code-input-digit-${index}`}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            aria-label={getDigitAriaLabel(values[index])}
            aria-describedby={labelId}
          />
        ))}
      </div>
    </CodeInputWrapper>
  );
};
