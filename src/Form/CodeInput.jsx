/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

import PropTypes from 'prop-types';
import React from 'react';
import styled from 'styled-components';

const CodeInputWrapper = styled.div`
  display: flex;
  justify-content: center;
`;

const DigitInput = styled.input`
  line-height: 56px;
  width: 48px;
  font-size: 32px;
  border: none;
  border-radius: 4px;
  text-align: center;
  color: black;
  outline: none;
  & + & {
    margin-left: 19px;
  }
`;

class CodeInput extends React.PureComponent {
  static propTypes = {
    autoFocus: PropTypes.bool,
    digits: PropTypes.number,
    onCodeComplete: PropTypes.func,
    style: PropTypes.object,
  };

  static defaultProps = {
    autoFocus: false,
    digits: 6,
    onCodeComplete: () => {},
    style: null,
  };

  constructor(props) {
    super(props);
    this.state = {
      values: Array(props.digits).fill(''),
    };
    this.inputs = [];
  }

  setValue = (num, value) => {
    if (/^[0-9]?$/.test(value)) {
      const values = [...this.state.values];
      values[num] = value;
      this.setState({values}, this.handleCompleteCode);
      if (value.length) {
        this.nextField(num);
      }
    }
  };

  handlePaste = (num, pastedValue) => {
    const cleanedPaste = pastedValue.replace(/[^0-9]/, '');
    if (new RegExp(`^[0-9]+$`).test(cleanedPaste)) {
      const values = [...this.state.values];
      const newValues = cleanedPaste.split('');
      values.splice.apply(values, [num, newValues.length, ...newValues]);
      this.setState({values: values.slice(0, this.props.digits)}, this.handleCompleteCode);
    }
  };

  handleCompleteCode = () => {
    const completeCode = this.state.values.join('');
    if (completeCode.length === this.props.digits) {
      this.props.onCodeComplete(completeCode);
    }
  };

  nextField = currentFieldNum => {
    const nextFieldNum = currentFieldNum + 1;
    if (nextFieldNum < this.props.digits) {
      this.inputs[nextFieldNum].focus();
    }
  };

  prevField = currentFieldNum => {
    if (currentFieldNum > 0) {
      this.inputs[currentFieldNum - 1].focus();
    }
  };

  handleKeyDown = (fieldNum, event) => {
    let preventDefault = true;
    switch (event.key) {
      case 'Backspace':
        this.setValue(fieldNum, '');
        this.prevField(fieldNum);
        break;
      case 'ArrowLeft':
        this.prevField(fieldNum);
        break;
      case 'ArrowRight':
        this.nextField(fieldNum);
        break;
      default:
        preventDefault = false;
    }
    if (preventDefault) {
      event.preventDefault();
    }
  };

  render() {
    const {values} = this.state;
    const inputs = [];
    for (let index = 0; index < this.props.digits; index++) {
      inputs.push(
        <DigitInput
          autoFocus={index === 0 && this.props.autoFocus}
          key={index}
          onChange={event => this.setValue(index, event.target.value)}
          onPaste={event => this.handlePaste(index, event.clipboardData.getData('Text'))}
          onFocus={event => event.target.select()}
          onKeyDown={event => this.handleKeyDown(index, event)}
          innerRef={node => (this.inputs[index] = node)}
          type="text"
          value={values[index]}
        />
      );
    }
    return <CodeInputWrapper style={this.props.style}>{inputs}</CodeInputWrapper>;
  }
}

export {CodeInput};
