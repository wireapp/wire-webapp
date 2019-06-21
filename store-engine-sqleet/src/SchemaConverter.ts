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

const uint32 = require('uint32');

export const SQLeetEnginePrimaryKeyName: string = '`key`';

export enum SQLiteType {
  BOOLEAN = 'boolean',
  DATETIME = 'datetime',
  INTEGER = 'integer',
  // See https://stackoverflow.com/a/8417411
  JSON = 'json',
  REAL = 'real',
  TEXT = 'text',
}

export type SQLiteTableDefinition<T> = Partial<Record<keyof T, SQLiteType>>;

export type SQLiteDatabaseDefinition<T> = Record<string, SQLiteTableDefinition<T>>;

export const escape = (value: string, delimiter: string = '`') => {
  return `${delimiter}${value.replace(new RegExp(delimiter, 'g'), `\\${delimiter}`)}${delimiter}`;
};

export function createTableIfNotExists<T>(tableName: string, columns: SQLiteTableDefinition<T>): string {
  const statements = ['`key` varchar(255) PRIMARY KEY'].concat(
    Object.entries(columns).map(([key, type]) => `${escape(key)} ${type}`),
  );
  return `CREATE TABLE IF NOT EXISTS ${escape(tableName)} (${statements.join(',')});`;
}

export function getFormattedColumnsFromTableName(
  tableNameColumns: Partial<Record<string, SQLiteType>>,
  withKey: boolean = false,
): string {
  return `${withKey ? `${SQLeetEnginePrimaryKeyName},` : ''}${Object.keys(tableNameColumns)
    .map(column => escape(column))
    .join(',')}`;
}

export function getFormattedColumnsFromColumns(
  tableNameColumns: Record<string, string>,
  withKey: boolean = false,
): string {
  return `${withKey ? `${SQLeetEnginePrimaryKeyName},` : ''}${Object.values(tableNameColumns)
    .map(column => escape(column))
    .join(',')}`;
}

export function getProtectedColumnReferences(columns: Record<string, string>): string {
  return Object.keys(columns)
    .map((reference: string) => `${escape(columns[reference])}=${reference}`)
    .join(',');
}

export function hashColumnName(column: string): number {
  let hash = uint32.toUint32(0);
  const key = column.toLowerCase();

  for (let index = 0; index < key.length; index++) {
    hash = uint32.addMod32(hash, uint32.toUint32(key.charCodeAt(index)));
    hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 10));
    hash = uint32.xor(hash, uint32.shiftRight(hash, 6));
  }

  hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 3));
  hash = uint32.xor(hash, uint32.shiftRight(hash, 11));
  hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 15));

  return hash;
}
