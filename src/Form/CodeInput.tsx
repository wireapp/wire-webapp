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
import {ObjectInterpolation, jsx} from '@emotion/core';
import React from 'react';
import {InputProps, inputStyle} from './Input';

const CodeInputWrapper = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={{
      display: 'flex',
      justifyContent: 'center',
    }}
    {...props}
  />
);

interface DigitInputProps<T = HTMLInputElement> extends InputProps<T> {}

const digitInputStyle: <T>(props: DigitInputProps<T>) => ObjectInterpolation<undefined> = props => ({
  ...inputStyle(props),
  '& + &': {
    marginLeft: '19px',
  },
  fontSize: '32px',
  lineHeight: '56px',
  padding: 0,
  textAlign: 'center',
  width: '48px',
});

const DigitInput = React.forwardRef<HTMLInputElement, DigitInputProps>((props, ref) => (
  <input ref={ref} css={digitInputStyle(props)} {...props} />
));

export interface CodeInputProps<T = HTMLInputElement> extends InputProps<T> {
  autoFocus?: boolean;
  digits?: number;
  onCodeComplete?: (completeCode?: string) => void;
}

interface CodeInputState {
  values: string[];
}

class CodeInput extends React.PureComponent<CodeInputProps, CodeInputState> {
  inputs: HTMLInputElement[];

  static defaultProps = {
    autoFocus: false,
    digits: 6,
    onCodeComplete: () => {},
  };

  constructor(props: CodeInputProps) {
    super(props);
    this.state = {
      values: Array(props.digits).fill(''),
    };
    this.inputs = [];
  }

  setValue = (fieldIndex: number, value: string) => {
    if (/^[0-9]?$/.test(value)) {
      const values = [...this.state.values];
      values[fieldIndex] = value;
      this.setState({values}, this.handleCompleteCode);
      if (value.length) {
        this.nextField(fieldIndex);
      }
    }
  };

  handlePaste = (fieldIndex: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedValue = event.clipboardData.getData('Text');
    const cleanedPaste = pastedValue.replace(/[^0-9]/, '');
    if (new RegExp(`^[0-9]+$`).test(cleanedPaste)) {
      const values = [...this.state.values];
      const newValues = cleanedPaste.split('');
      values.splice.apply(values, [fieldIndex, newValues.length, ...newValues]);
      this.setState({values: values.slice(0, this.props.digits)}, this.handleCompleteCode);
    }
  };

  handleCompleteCode = () => {
    const completeCode = this.state.values.join('');
    if (completeCode.length === this.props.digits && this.props.onCodeComplete) {
      this.props.onCodeComplete(completeCode);
    }
  };

  nextField = (currentFieldIndex: number) => {
    const nextFieldIndex = currentFieldIndex + 1;
    if (nextFieldIndex < (this.props.digits || CodeInput.defaultProps.digits)) {
      this.inputs[nextFieldIndex].focus();
    }
  };

  previousField = (currentFieldIndex: number) => {
    if (currentFieldIndex > 0) {
      this.inputs[currentFieldIndex - 1].focus();
    }
  };

  handleKeyDown = (fieldIndex: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Backspace':
        this.setValue(fieldIndex, '');
        this.previousField(fieldIndex);
        break;
      case 'ArrowLeft':
        this.previousField(fieldIndex);
        break;
      case 'ArrowRight':
        this.nextField(fieldIndex);
        break;
    }
    if (/^[0-9]$/.test(event.key)) {
      this.setValue(fieldIndex, event.key);
    }
  };

  forceSelection(event: any) {
    const target: HTMLInputElement = event.target;
    target.select();
  }

  forceSelectionPreventDefault = (event: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    this.forceSelection(event);
    event.preventDefault();
  };

  render() {
    const {values} = this.state;
    const inputs = [];
    for (let fieldIndex = 0; fieldIndex < (this.props.digits || CodeInput.defaultProps.digits); fieldIndex++) {
      inputs.push(
        <DigitInput
          autoFocus={fieldIndex === 0 && this.props.autoFocus}
          key={fieldIndex}
          onPaste={event => this.handlePaste(fieldIndex, event)}
          onFocus={this.forceSelection}
          onMouseDown={this.forceSelectionPreventDefault}
          onTouchStart={this.forceSelectionPreventDefault}
          onKeyDown={event => this.handleKeyDown(fieldIndex, event)}
          onKeyUp={this.forceSelection}
          ref={node => (this.inputs[fieldIndex] = node)}
          type="text"
          value={values[fieldIndex]}
          onChange={() => {}}
        />
      );
    }
    return <CodeInputWrapper style={this.props.style}>{inputs}</CodeInputWrapper>;
  }
}

export {CodeInput};
