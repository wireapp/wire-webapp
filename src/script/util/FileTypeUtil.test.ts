/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {isFileEditable} from './FileTypeUtil';

describe('isFileEditable', () => {
  it('returns true for odf extension', () => {
    expect(isFileEditable('odf')).toBe(true);
  });

  it('returns true for docx extension', () => {
    expect(isFileEditable('docx')).toBe(true);
  });

  it('returns true for xlsx extension', () => {
    expect(isFileEditable('xlsx')).toBe(true);
  });

  it('returns true for pptx extension', () => {
    expect(isFileEditable('pptx')).toBe(true);
  });

  it('returns true for uppercase ODF extension', () => {
    expect(isFileEditable('ODF')).toBe(true);
  });

  it('returns true for uppercase DOCX extension', () => {
    expect(isFileEditable('DOCX')).toBe(true);
  });

  it('returns true for uppercase XLSX extension', () => {
    expect(isFileEditable('XLSX')).toBe(true);
  });

  it('returns true for uppercase PPTX extension', () => {
    expect(isFileEditable('PPTX')).toBe(true);
  });

  it('returns true for mixed case extensions', () => {
    expect(isFileEditable('Docx')).toBe(true);
    expect(isFileEditable('XlSx')).toBe(true);
    expect(isFileEditable('PpTx')).toBe(true);
    expect(isFileEditable('OdF')).toBe(true);
  });

  it('returns false for non-editable extensions', () => {
    expect(isFileEditable('pdf')).toBe(false);
    expect(isFileEditable('txt')).toBe(false);
    expect(isFileEditable('jpg')).toBe(false);
    expect(isFileEditable('png')).toBe(false);
    expect(isFileEditable('mp4')).toBe(false);
    expect(isFileEditable('zip')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isFileEditable('')).toBe(false);
  });

  it('returns false for older Microsoft Office extensions', () => {
    expect(isFileEditable('doc')).toBe(false);
    expect(isFileEditable('xls')).toBe(false);
    expect(isFileEditable('ppt')).toBe(false);
  });

  it('returns false for extensions with leading dot', () => {
    expect(isFileEditable('.docx')).toBe(false);
    expect(isFileEditable('.xlsx')).toBe(false);
    expect(isFileEditable('.pptx')).toBe(false);
  });

  it('returns false for extensions with trailing spaces', () => {
    expect(isFileEditable('docx ')).toBe(false);
    expect(isFileEditable(' docx')).toBe(false);
  });

  it('returns false for partial matches', () => {
    expect(isFileEditable('docxs')).toBe(false);
    expect(isFileEditable('xdocx')).toBe(false);
    expect(isFileEditable('doc')).toBe(false);
  });

  it('returns false for similar but unsupported extensions', () => {
    expect(isFileEditable('odt')).toBe(false);
    expect(isFileEditable('ods')).toBe(false);
    expect(isFileEditable('odp')).toBe(false);
  });

  it('returns false for undefined or null-like values converted to strings', () => {
    // TypeScript would catch these at compile time, but testing runtime behavior
    expect(isFileEditable('undefined')).toBe(false);
    expect(isFileEditable('null')).toBe(false);
  });
});
