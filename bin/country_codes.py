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

# use this script to generate country codes using countrycode.org
# it will generate a json file with all the country codes
# use js2coffee to convert it to coffeecript and add it to CountryCodes.coffee
#
# Preparation:
# pip install requests json BeautifulSoup
#
# Run:
# python country_codes.py

import os
import sys
import requests
import json
from BeautifulSoup import BeautifulSoup

page = requests.get('http://countrycode.org/')
soup = BeautifulSoup(page.text)
rows = soup.findChildren('table')[0].findChildren(['tr'])
country_codes_json = []

for row in rows:
  cells = row.findChildren('td')

  if cells:
    country_codes_json.append({
      'name': cells[0].find('a').string,
      'code': int(cells[1].string.split(',', 1)[0].replace('-','')),
      'iso': cells[2].string.split('/', 1)[0].strip(),
      'population': int(cells[3].string.replace(',', ''))
    })

with open(os.path.dirname(sys.argv[0]) + '/codes.json', 'w') as outfile:
  json.dump(country_codes_json, outfile, indent=2)
