#!/usr/bin/python
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
import sys

home_dir = os.path.expanduser('~')
user_config = os.path.join(home_dir, '.crowdin.yaml')

os.system('crowdin-cli-py --identity={} upload sources'.format(user_config))
os.system('crowdin-cli-py --identity={} download'.format(user_config))

os.chdir(os.path.dirname(os.path.realpath(__file__)))

def get_locale(filename):
  locale = filename.replace('strings-', '').replace('.coffee', '')
  return locale if len(locale) == 2 else None

root = 'app/script/localization/'

for filename in os.listdir(root):
  locale = get_locale(filename)
  if locale:
    if locale != 'de':
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
      source = source[:source.rfind('\n')]
      f.write(source)
