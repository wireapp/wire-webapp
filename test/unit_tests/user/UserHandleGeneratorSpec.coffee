#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

# grunt test_init && grunt test_run:user/UserHandleGenerator

describe 'UserHandleGenerator', ->

  describe 'normalize_name', ->
    it 'should normalize user names', ->
      expect(z.user.UserHandleGenerator.normalize_name('Maria LaRochelle')).toBe 'marialarochelle'
      expect(z.user.UserHandleGenerator.normalize_name("Mêrié \"LaRöche'lle\"")).toBe 'merielarochelle'
      expect(z.user.UserHandleGenerator.normalize_name('Maria I ❤️🍕')).toBe 'mariai'
      expect(z.user.UserHandleGenerator.normalize_name('.-/Maria\-.')).toBe 'maria'
      expect(z.user.UserHandleGenerator.normalize_name('苹果')).toBe 'pingguo'
      expect(z.user.UserHandleGenerator.normalize_name('תפוח ')).toBe 'tpwh'
      expect(z.user.UserHandleGenerator.normalize_name('सेवफलम्')).toBe 'sevaphalam'
      expect(z.user.UserHandleGenerator.normalize_name('μήλο')).toBe 'melo'
      expect(z.user.UserHandleGenerator.normalize_name('Яблоко')).toBe 'abloko'
      expect(z.user.UserHandleGenerator.normalize_name('خطای سطح دسترسی')).toBe 'khtaysthdstrsy'
      expect(z.user.UserHandleGenerator.normalize_name('ᑭᒻᒥᓇᐅᔭᖅ')).toBe ''
      expect(z.user.UserHandleGenerator.normalize_name('    Maria LaRochelle Von Schwerigstein ')).toBe 'marialarochellevonschw'
      expect(z.user.UserHandleGenerator.normalize_name(' \n\t Maria LaRochelle Von Schwerigstein ')).toBe 'marialarochellevonschw'
      expect(z.user.UserHandleGenerator.normalize_name('🐙☀️')).toBe ''
      expect(z.user.UserHandleGenerator.normalize_name('name@mail.com')).toBe 'namemailcom'

  describe 'validate', ->

    it 'returns false if username length is outside the specific range', ->
      expect(z.user.UserHandleGenerator.validate '').toBeFalsy()
      expect(z.user.UserHandleGenerator.validate 'a').toBeFalsy()
      expect(z.user.UserHandleGenerator.validate 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa').toBeFalsy()

    it 'returns false if username contains uppercase characters', ->
      expect(z.user.UserHandleGenerator.validate 'AAA').toBeFalsy()
      expect(z.user.UserHandleGenerator.validate 'Aaa').toBeFalsy()

    it 'returns false if username is not a string', ->
      expect(z.user.UserHandleGenerator.validate()).toBeFalsy()
      expect(z.user.UserHandleGenerator.validate(null)).toBeFalsy()
      expect(z.user.UserHandleGenerator.validate({})).toBeFalsy()
      expect(z.user.UserHandleGenerator.validate(1)).toBeFalsy()

    it 'returns false if username contains other than alphanumeric characters and underscores', ->
      expect(z.user.UserHandleGenerator.validate('太陽')).toBeFalsy()
      expect(z.user.UserHandleGenerator.validate('شمس')).toBeFalsy()
      expect(z.user.UserHandleGenerator.validate('!"§$%&/()=?')).toBeFalsy()

    it 'returns true if username only contains alphanumeric characters and underscores', ->
      expect(z.user.UserHandleGenerator.validate('foobla')).toBeTruthy()
      expect(z.user.UserHandleGenerator.validate('foo_bla')).toBeTruthy()
      expect(z.user.UserHandleGenerator.validate('foo_bla_83')).toBeTruthy()
