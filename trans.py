#!/usr/bin/python
# coding: utf-8
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

import os
import shutil
import sys
reload(sys)
sys.setdefaultencoding('utf8')

SUPPORTED_LOCALE = [
  'cs',
  'de',
  'es',
  'fi',
  'fr',
  'hr',
  'it',
  'pt',
  'ro',
  'ru',
  'sl',
  'tr',
  'uk',
]
home_dir = os.path.expanduser('~')

os.system('crowdin-cli --identity=keys/crowdin.yaml upload sources')
os.system('crowdin-cli --identity=keys/crowdin.yaml download')

os.chdir(os.path.dirname(os.path.realpath(__file__)))
root = 'app/script/localization/'


def remove_country(filename):
  parts = filename.split('-')
  if len(parts) == 3:
    source = os.path.join(root, filename)
    dest = os.path.join(root, '%s-%s.coffee' % (parts[0], parts[1]))
    shutil.move(source, dest)


def get_locale(filename):
  locale = filename.replace('strings-', '').replace('.coffee', '')
  return locale if len(locale) == 2 else None


def fix_apostrophe(text):
  if not text:
    return text
  text = unicode(text, errors='ignore')
  first = text.find(u"'")
  last = text.rfind(u"'")
  if first != last:
    pre = text[0:first + 1]
    string = text[first + 1:last]
    post = text[last:]
    return '%s%s%s' % (pre, string.replace(u"'", u'’'), post)
  return text


for filename in os.listdir(root):
  remove_country(filename)
  locale = get_locale(filename)
  if locale:
    if locale not in SUPPORTED_LOCALE:
      file_to_delete = os.path.join(root, filename)
      sys.stdout.write('Removing unsupported locale "{}" ({})\n'.format(locale, file_to_delete))
      os.remove(file_to_delete)
      continue

    with open(os.path.join(root, filename), 'r') as f:
      source = f.read()

    with open(os.path.join(root, filename), 'w') as f:
      zstr = 'z.string.'
      zstrl = 'z.string.%s.' % locale
      source = source.replace('#X-Generator: crowdin.com\n', '')
      source = source.replace(zstrl, zstr).replace(zstr, zstrl)
      source = source.replace("='", " = '")
      source = source.replace('\:', ':')
      source = '\n'.join(map(fix_apostrophe, source.splitlines()))
      f.write(source)
