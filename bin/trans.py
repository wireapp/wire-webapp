#!/usr/bin/python
# coding: utf-8
#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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
  'da',
  'de',
  'el',
  'es',
  'et',
  'fi',
  'fr',
  'hr',
  'hu',
  'it',
  'lt',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'tr',
  'uk',
  'zh',
]

root = os.path.join(os.path.dirname(os.path.realpath(__file__)), os.pardir)
preamble_js = os.path.join(root, 'bin', 'preamble.js')
crowdin_yaml = os.path.join(root, 'keys', 'crowdin.yaml')
translations_dir = os.path.join(root, 'app', 'script', 'localization', 'translations')
os.chdir(root)
os.system('crowdin-cli --identity=%s upload sources' % crowdin_yaml)
os.system('crowdin-cli --identity=%s download' % crowdin_yaml)


def remove_country_from_filename(filename):
  parts = filename.split('-')
  source = os.path.join(translations_dir, filename)
  dest = source
  if len(parts) == 3:
    dest = os.path.join(translations_dir, '%s-%s.js' % (parts[0], parts[1]))
    shutil.move(source, dest)
  return dest


def get_locale(filename):
  if filename.find('webapp-') == -1:
    return None
  locale = filename.replace('webapp-', '').replace('.js', '')
  return locale or None


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
    return '{}{}{}'.format(pre, string.replace(u"'", u'’'), post)
  return text

# Remove the unsupported translations
for filename in os.listdir(translations_dir):
  locale = get_locale(filename)
  if not locale:
    continue

  if locale.split('-')[0] not in SUPPORTED_LOCALE:
    file_to_delete = os.path.join(translations_dir, filename)
    print 'Removing unsupported locale "{}"'.format(locale)
    os.remove(file_to_delete)
    continue
  remove_country_from_filename(filename)


# Cleanup files
for filename in os.listdir(translations_dir):
  locale = get_locale(filename)
  if locale not in SUPPORTED_LOCALE:
    continue

  with open(preamble_js, 'r') as f:
    preamble = f.read()

  with open(os.path.join(translations_dir, filename), 'r') as f:
    source = f.read()

  with open(os.path.join(translations_dir, filename), 'w') as f:
    zstr = 'z.string.'
    zstrl = 'z.string.{}.'.format(locale)
    source = '{}\n{}'.format(preamble, source)
    source = source.replace('#X-Generator: crowdin.com\n', "'use strict';")
    source = source.replace("'use=strict';\n", '')
    source = source.replace(zstrl, zstr).replace(zstr, zstrl)
    source = source.replace("='", " = '")
    source = source.replace('\:', ':')
    source = source.replace('\n\n\n', '\n\n')
    source = '\n'.join(map(fix_apostrophe, source.splitlines()))
    f.write(source)
