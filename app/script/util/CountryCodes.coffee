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

window.z ?= {}
z.util ?= {}

z.util.CountryCodes = do ->

  ###
  Get the country code matching an ISO name

  @param iso_name [String] ISO standard country name

  @return [Integer] Matching country code
  ###
  get_country_code = (iso_name) ->
    for country in COUNTRY_CODES
      return country.code if country.iso is iso_name

  ###
  Get the full-text country name matching an ISO name

  @param iso_name [String] ISO standard country name

  @return [String] Matching full-text country name
  ###
  get_country_name = (iso_name) ->
    for country in COUNTRY_CODES
      return country.name if country.iso is iso_name

  ###
  Get the country code matching to an ISO name

  @param code [Integer] Country code

  @return [String] Returns the ISO standard country name of the most populated country with the matching country code
  ###
  get_country_by_code = (code) ->
    countries = []

    for country in COUNTRY_CODES
      countries.push country if country.code is window.parseInt code, 10

    countries = countries.sort (country_a, country_b) ->
      return country_a.population - country_b.population

    return countries.pop()?.iso

  COUNTRY_CODES = [
    {
      'code': 93
      'iso': 'AF'
      'name': 'Afghanistan'
      'population': 31
    }
    {
      'code': 355
      'iso': 'AL'
      'name': 'Albania'
      'population': 2
    }
    {
      'code': 213
      'iso': 'DZ'
      'name': 'Algeria'
      'population': 34
    }
    {
      'code': 1684
      'iso': 'AS'
      'name': 'American Samoa'
      'population': 0
    }
    {
      'code': 376
      'iso': 'AD'
      'name': 'Andorra'
      'population': 0
    }
    {
      'code': 244
      'iso': 'AO'
      'name': 'Angola'
      'population': 13
    }
    {
      'code': 1264
      'iso': 'AI'
      'name': 'Anguilla'
      'population': 0
    }
    {
      'code': 672
      'iso': 'AQ'
      'name': 'Antarctica'
      'population': 0
    }
    {
      'code': 1268
      'iso': 'AG'
      'name': 'Antigua and Barbuda'
      'population': 0
    }
    {
      'code': 54
      'iso': 'AR'
      'name': 'Argentina'
      'population': 41
    }
    {
      'code': 374
      'iso': 'AM'
      'name': 'Armenia'
      'population': 2
    }
    {
      'code': 297
      'iso': 'AW'
      'name': 'Aruba'
      'population': 0
    }
    {
      'code': 61
      'iso': 'AU'
      'name': 'Australia'
      'population': 21
    }
    {
      'code': 43
      'iso': 'AT'
      'name': 'Austria'
      'population': 8
    }
    {
      'code': 994
      'iso': 'AZ'
      'name': 'Azerbaijan'
      'population': 8
    }
    {
      'code': 1242
      'iso': 'BS'
      'name': 'Bahamas'
      'population': 0
    }
    {
      'code': 973
      'iso': 'BH'
      'name': 'Bahrain'
      'population': 0
    }
    {
      'code': 880
      'iso': 'BD'
      'name': 'Bangladesh'
      'population': 171
    }
    {
      'code': 1246
      'iso': 'BB'
      'name': 'Barbados'
      'population': 0
    }
    {
      'code': 375
      'iso': 'BY'
      'name': 'Belarus'
      'population': 9
    }
    {
      'code': 32
      'iso': 'BE'
      'name': 'Belgium'
      'population': 10
    }
    {
      'code': 501
      'iso': 'BZ'
      'name': 'Belize'
      'population': 0
    }
    {
      'code': 229
      'iso': 'BJ'
      'name': 'Benin'
      'population': 9
    }
    {
      'code': 1441
      'iso': 'BM'
      'name': 'Bermuda'
      'population': 0
    }
    {
      'code': 975
      'iso': 'BT'
      'name': 'Bhutan'
      'population': 0
    }
    {
      'code': 591
      'iso': 'BO'
      'name': 'Bolivia'
      'population': 9
    }
    {
      'code': 387
      'iso': 'BA'
      'name': 'Bosnia and Herzegovina'
      'population': 4
    }
    {
      'code': 267
      'iso': 'BW'
      'name': 'Botswana'
      'population': 2
    }
    {
      'code': 55
      'iso': 'BR'
      'name': 'Brazil'
      'population': 201
    }
    {
      'code': 246
      'iso': 'IO'
      'name': 'British Indian Ocean Territory'
      'population': 0
    }
    {
      'code': 1284
      'iso': 'VG'
      'name': 'British Virgin Islands'
      'population': 0
    }
    {
      'code': 673
      'iso': 'BN'
      'name': 'Brunei'
      'population': 0
    }
    {
      'code': 359
      'iso': 'BG'
      'name': 'Bulgaria'
      'population': 7
    }
    {
      'code': 226
      'iso': 'BF'
      'name': 'Burkina Faso'
      'population': 16
    }
    {
      'code': 257
      'iso': 'BI'
      'name': 'Burundi'
      'population': 9
    }
    {
      'code': 855
      'iso': 'KH'
      'name': 'Cambodia'
      'population': 14
    }
    {
      'code': 237
      'iso': 'CM'
      'name': 'Cameroon'
      'population': 19
    }
    {
      'code': 1
      'iso': 'CA'
      'name': 'Canada'
      'population': 33
    }
    {
      'code': 238
      'iso': 'CV'
      'name': 'Cape Verde'
      'population': 0
    }
    {
      'code': 1345
      'iso': 'KY'
      'name': 'Cayman Islands'
      'population': 0
    }
    {
      'code': 236
      'iso': 'CF'
      'name': 'Central African Republic'
      'population': 4
    }
    {
      'code': 235
      'iso': 'TD'
      'name': 'Chad'
      'population': 10
    }
    {
      'code': 56
      'iso': 'CL'
      'name': 'Chile'
      'population': 16
    }
    {
      'code': 86
      'iso': 'CN'
      'name': 'China'
      'population': 1376
    }
    {
      'code': 61
      'iso': 'CX'
      'name': 'Christmas Island'
      'population': 0
    }
    {
      'code': 61
      'iso': 'CC'
      'name': 'Cocos Islands'
      'population': 0
    }
    {
      'code': 57
      'iso': 'CO'
      'name': 'Colombia'
      'population': 47
    }
    {
      'code': 269
      'iso': 'KM'
      'name': 'Comoros'
      'population': 0
    }
    {
      'code': 682
      'iso': 'CK'
      'name': 'Cook Islands'
      'population': 0
    }
    {
      'code': 506
      'iso': 'CR'
      'name': 'Costa Rica'
      'population': 4
    }
    {
      'code': 385
      'iso': 'HR'
      'name': 'Croatia'
      'population': 4
    }
    {
      'code': 53
      'iso': 'CU'
      'name': 'Cuba'
      'population': 11
    }
    {
      'code': 599
      'iso': 'CW'
      'name': 'Curacao'
      'population': 0
    }
    {
      'code': 357
      'iso': 'CY'
      'name': 'Cyprus'
      'population': 1
    }
    {
      'code': 420
      'iso': 'CZ'
      'name': 'Czech Republic'
      'population': 10
    }
    {
      'code': 243
      'iso': 'CD'
      'name': 'Democratic Republic of the Congo'
      'population': 81
    }
    {
      'code': 45
      'iso': 'DK'
      'name': 'Denmark'
      'population': 5
    }
    {
      'code': 253
      'iso': 'DJ'
      'name': 'Djibouti'
      'population': 0
    }
    {
      'code': 1767
      'iso': 'DM'
      'name': 'Dominica'
      'population': 0
    }
    {
      'code': 1809
      'iso': 'DO'
      'name': 'Dominican Republic'
      'population': 9
    }
    {
      'code': 670
      'iso': 'TL'
      'name': 'East Timor'
      'population': 1
    }
    {
      'code': 593
      'iso': 'EC'
      'name': 'Ecuador'
      'population': 14
    }
    {
      'code': 20
      'iso': 'EG'
      'name': 'Egypt'
      'population': 91
    }
    {
      'code': 503
      'iso': 'SV'
      'name': 'El Salvador'
      'population': 6
    }
    {
      'code': 240
      'iso': 'GQ'
      'name': 'Equatorial Guinea'
      'population': 1
    }
    {
      'code': 291
      'iso': 'ER'
      'name': 'Eritrea'
      'population': 5
    }
    {
      'code': 372
      'iso': 'EE'
      'name': 'Estonia'
      'population': 1
    }
    {
      'code': 251
      'iso': 'ET'
      'name': 'Ethiopia'
      'population': 88
    }
    {
      'code': 500
      'iso': 'FK'
      'name': 'Falkland Islands'
      'population': 0
    }
    {
      'code': 298
      'iso': 'FO'
      'name': 'Faroe Islands'
      'population': 0
    }
    {
      'code': 679
      'iso': 'FJ'
      'name': 'Fiji'
      'population': 0
    }
    {
      'code': 358
      'iso': 'FI'
      'name': 'Finland'
      'population': 5
    }
    {
      'code': 33
      'iso': 'FR'
      'name': 'France'
      'population': 64
    }
    {
      'code': 689
      'iso': 'PF'
      'name': 'French Polynesia'
      'population': 0
    }
    {
      'code': 241
      'iso': 'GA'
      'name': 'Gabon'
      'population': 1
    }
    {
      'code': 220
      'iso': 'GM'
      'name': 'Gambia'
      'population': 1
    }
    {
      'code': 995
      'iso': 'GE'
      'name': 'Georgia'
      'population': 4
    }
    {
      'code': 49
      'iso': 'DE'
      'name': 'Germany'
      'population': 81
    }
    {
      'code': 233
      'iso': 'GH'
      'name': 'Ghana'
      'population': 24
    }
    {
      'code': 350
      'iso': 'GI'
      'name': 'Gibraltar'
      'population': 0
    }
    {
      'code': 30
      'iso': 'GR'
      'name': 'Greece'
      'population': 11
    }
    {
      'code': 299
      'iso': 'GL'
      'name': 'Greenland'
      'population': 0
    }
    {
      'code': 1473
      'iso': 'GD'
      'name': 'Grenada'
      'population': 0
    }
    {
      'code': 1671
      'iso': 'GU'
      'name': 'Guam'
      'population': 0
    }
    {
      'code': 502
      'iso': 'GT'
      'name': 'Guatemala'
      'population': 13
    }
    {
      'code': 441481
      'iso': 'GG'
      'name': 'Guernsey'
      'population': 0
    }
    {
      'code': 224
      'iso': 'GN'
      'name': 'Guinea'
      'population': 10
    }
    {
      'code': 245
      'iso': 'GW'
      'name': 'Guinea-Bissau'
      'population': 1
    }
    {
      'code': 592
      'iso': 'GY'
      'name': 'Guyana'
      'population': 0
    }
    {
      'code': 509
      'iso': 'HT'
      'name': 'Haiti'
      'population': 9
    }
    {
      'code': 504
      'iso': 'HN'
      'name': 'Honduras'
      'population': 7
    }
    {
      'code': 852
      'iso': 'HK'
      'name': 'Hong Kong'
      'population': 6
    }
    {
      'code': 36
      'iso': 'HU'
      'name': 'Hungary'
      'population': 9
    }
    {
      'code': 354
      'iso': 'IS'
      'name': 'Iceland'
      'population': 0
    }
    {
      'code': 91
      'iso': 'IN'
      'name': 'India'
      'population': 1173
    }
    {
      'code': 62
      'iso': 'ID'
      'name': 'Indonesia'
      'population': 242
    }
    {
      'code': 98
      'iso': 'IR'
      'name': 'Iran'
      'population': 76
    }
    {
      'code': 964
      'iso': 'IQ'
      'name': 'Iraq'
      'population': 29
    }
    {
      'code': 353
      'iso': 'IE'
      'name': 'Ireland'
      'population': 4
    }
    {
      'code': 441624
      'iso': 'IM'
      'name': 'Isle of Man'
      'population': 0
    }
    {
      'code': 972
      'iso': 'IL'
      'name': 'Israel'
      'population': 7
    }
    {
      'code': 39
      'iso': 'IT'
      'name': 'Italy'
      'population': 60
    }
    {
      'code': 225
      'iso': 'CI'
      'name': 'Ivory Coast'
      'population': 21
    }
    {
      'code': 1876
      'iso': 'JM'
      'name': 'Jamaica'
      'population': 2
    }
    {
      'code': 81
      'iso': 'JP'
      'name': 'Japan'
      'population': 127
    }
    {
      'code': 441534
      'iso': 'JE'
      'name': 'Jersey'
      'population': 0
    }
    {
      'code': 962
      'iso': 'JO'
      'name': 'Jordan'
      'population': 6
    }
    {
      'code': 7
      'iso': 'KZ'
      'name': 'Kazakhstan'
      'population': 15
    }
    {
      'code': 254
      'iso': 'KE'
      'name': 'Kenya'
      'population': 40
    }
    {
      'code': 686
      'iso': 'KI'
      'name': 'Kiribati'
      'population': 0
    }
    {
      'code': 383
      'iso': 'XK'
      'name': 'Kosovo'
      'population': 1
    }
    {
      'code': 965
      'iso': 'KW'
      'name': 'Kuwait'
      'population': 2
    }
    {
      'code': 996
      'iso': 'KG'
      'name': 'Kyrgyzstan'
      'population': 5
    }
    {
      'code': 856
      'iso': 'LA'
      'name': 'Laos'
      'population': 6
    }
    {
      'code': 371
      'iso': 'LV'
      'name': 'Latvia'
      'population': 2
    }
    {
      'code': 961
      'iso': 'LB'
      'name': 'Lebanon'
      'population': 4
    }
    {
      'code': 266
      'iso': 'LS'
      'name': 'Lesotho'
      'population': 1
    }
    {
      'code': 231
      'iso': 'LR'
      'name': 'Liberia'
      'population': 3
    }
    {
      'code': 218
      'iso': 'LY'
      'name': 'Libya'
      'population': 6
    }
    {
      'code': 423
      'iso': 'LI'
      'name': 'Liechtenstein'
      'population': 0
    }
    {
      'code': 370
      'iso': 'LT'
      'name': 'Lithuania'
      'population': 2
    }
    {
      'code': 352
      'iso': 'LU'
      'name': 'Luxembourg'
      'population': 0
    }
    {
      'code': 853
      'iso': 'MO'
      'name': 'Macao'
      'population': 0
    }
    {
      'code': 389
      'iso': 'MK'
      'name': 'Macedonia'
      'population': 2
    }
    {
      'code': 261
      'iso': 'MG'
      'name': 'Madagascar'
      'population': 21
    }
    {
      'code': 265
      'iso': 'MW'
      'name': 'Malawi'
      'population': 15
    }
    {
      'code': 60
      'iso': 'MY'
      'name': 'Malaysia'
      'population': 28
    }
    {
      'code': 960
      'iso': 'MV'
      'name': 'Maldives'
      'population': 0
    }
    {
      'code': 223
      'iso': 'ML'
      'name': 'Mali'
      'population': 13
    }
    {
      'code': 356
      'iso': 'MT'
      'name': 'Malta'
      'population': 0
    }
    {
      'code': 692
      'iso': 'MH'
      'name': 'Marshall Islands'
      'population': 0
    }
    {
      'code': 222
      'iso': 'MR'
      'name': 'Mauritania'
      'population': 3
    }
    {
      'code': 230
      'iso': 'MU'
      'name': 'Mauritius'
      'population': 1
    }
    {
      'code': 262
      'iso': 'YT'
      'name': 'Mayotte'
      'population': 0
    }
    {
      'code': 52
      'iso': 'MX'
      'name': 'Mexico'
      'population': 112
    }
    {
      'code': 691
      'iso': 'FM'
      'name': 'Micronesia'
      'population': 0
    }
    {
      'code': 373
      'iso': 'MD'
      'name': 'Moldova'
      'population': 4
    }
    {
      'code': 377
      'iso': 'MC'
      'name': 'Monaco'
      'population': 0
    }
    {
      'code': 976
      'iso': 'MN'
      'name': 'Mongolia'
      'population': 3
    }
    {
      'code': 382
      'iso': 'ME'
      'name': 'Montenegro'
      'population': 0
    }
    {
      'code': 1664
      'iso': 'MS'
      'name': 'Montserrat'
      'population': 0
    }
    {
      'code': 212
      'iso': 'MA'
      'name': 'Morocco'
      'population': 33
    }
    {
      'code': 258
      'iso': 'MZ'
      'name': 'Mozambique'
      'population': 22
    }
    {
      'code': 95
      'iso': 'MM'
      'name': 'Myanmar'
      'population': 53
    }
    {
      'code': 264
      'iso': 'NA'
      'name': 'Namibia'
      'population': 2
    }
    {
      'code': 674
      'iso': 'NR'
      'name': 'Nauru'
      'population': 0
    }
    {
      'code': 977
      'iso': 'NP'
      'name': 'Nepal'
      'population': 28
    }
    {
      'code': 31
      'iso': 'NL'
      'name': 'Netherlands'
      'population': 16
    }
    {
      'code': 599
      'iso': 'AN'
      'name': 'Netherlands Antilles'
      'population': 0
    }
    {
      'code': 687
      'iso': 'NC'
      'name': 'New Caledonia'
      'population': 0
    }
    {
      'code': 64
      'iso': 'NZ'
      'name': 'New Zealand'
      'population': 4
    }
    {
      'code': 505
      'iso': 'NI'
      'name': 'Nicaragua'
      'population': 5
    }
    {
      'code': 227
      'iso': 'NE'
      'name': 'Niger'
      'population': 15
    }
    {
      'code': 234
      'iso': 'NG'
      'name': 'Nigeria'
      'population': 182
    }
    {
      'code': 683
      'iso': 'NU'
      'name': 'Niue'
      'population': 0
    }
    {
      'code': 850
      'iso': 'KP'
      'name': 'North Korea'
      'population': 22
    }
    {
      'code': 1670
      'iso': 'MP'
      'name': 'Northern Mariana Islands'
      'population': 0
    }
    {
      'code': 47
      'iso': 'NO'
      'name': 'Norway'
      'population': 5
    }
    {
      'code': 968
      'iso': 'OM'
      'name': 'Oman'
      'population': 2
    }
    {
      'code': 92
      'iso': 'PK'
      'name': 'Pakistan'
      'population': 184
    }
    {
      'code': 680
      'iso': 'PW'
      'name': 'Palau'
      'population': 0
    }
    {
      'code': 970
      'iso': 'PS'
      'name': 'Palestine'
      'population': 3
    }
    {
      'code': 507
      'iso': 'PA'
      'name': 'Panama'
      'population': 3
    }
    {
      'code': 675
      'iso': 'PG'
      'name': 'Papua New Guinea'
      'population': 6
    }
    {
      'code': 595
      'iso': 'PY'
      'name': 'Paraguay'
      'population': 6
    }
    {
      'code': 51
      'iso': 'PE'
      'name': 'Peru'
      'population': 29
    }
    {
      'code': 63
      'iso': 'PH'
      'name': 'Philippines'
      'population': 102
    }
    {
      'code': 64
      'iso': 'PN'
      'name': 'Pitcairn'
      'population': 0
    }
    {
      'code': 48
      'iso': 'PL'
      'name': 'Poland'
      'population': 38
    }
    {
      'code': 351
      'iso': 'PT'
      'name': 'Portugal'
      'population': 10
    }
    {
      'code': 1787
      'iso': 'PR'
      'name': 'Puerto Rico'
      'population': 3
    }
    {
      'code': 974
      'iso': 'QA'
      'name': 'Qatar'
      'population': 0
    }
    {
      'code': 242
      'iso': 'CG'
      'name': 'Republic of the Congo'
      'population': 3
    }
    {
      'code': 262
      'iso': 'RE'
      'name': 'Reunion'
      'population': 0
    }
    {
      'code': 40
      'iso': 'RO'
      'name': 'Romania'
      'population': 21
    }
    {
      'code': 7
      'iso': 'RU'
      'name': 'Russia'
      'population': 140
    }
    {
      'code': 250
      'iso': 'RW'
      'name': 'Rwanda'
      'population': 11
    }
    {
      'code': 590
      'iso': 'BL'
      'name': 'Saint Barthelemy'
      'population': 0
    }
    {
      'code': 290
      'iso': 'SH'
      'name': 'Saint Helena'
      'population': 0
    }
    {
      'code': 1869
      'iso': 'KN'
      'name': 'Saint Kitts and Nevis'
      'population': 0
    }
    {
      'code': 1758
      'iso': 'LC'
      'name': 'Saint Lucia'
      'population': 0
    }
    {
      'code': 590
      'iso': 'MF'
      'name': 'Saint Martin'
      'population': 0
    }
    {
      'code': 508
      'iso': 'PM'
      'name': 'Saint Pierre and Miquelon'
      'population': 0
    }
    {
      'code': 1784
      'iso': 'VC'
      'name': 'Saint Vincent and the Grenadines'
      'population': 0
    }
    {
      'code': 685
      'iso': 'WS'
      'name': 'Samoa'
      'population': 0
    }
    {
      'code': 378
      'iso': 'SM'
      'name': 'San Marino'
      'population': 0
    }
    {
      'code': 239
      'iso': 'ST'
      'name': 'Sao Tome and Principe'
      'population': 0
    }
    {
      'code': 966
      'iso': 'SA'
      'name': 'Saudi Arabia'
      'population': 25
    }
    {
      'code': 221
      'iso': 'SN'
      'name': 'Senegal'
      'population': 12
    }
    {
      'code': 381
      'iso': 'RS'
      'name': 'Serbia'
      'population': 7
    }
    {
      'code': 248
      'iso': 'SC'
      'name': 'Seychelles'
      'population': 0
    }
    {
      'code': 232
      'iso': 'SL'
      'name': 'Sierra Leone'
      'population': 5
    }
    {
      'code': 65
      'iso': 'SG'
      'name': 'Singapore'
      'population': 4
    }
    {
      'code': 1721
      'iso': 'SX'
      'name': 'Sint Maarten'
      'population': 0
    }
    {
      'code': 421
      'iso': 'SK'
      'name': 'Slovakia'
      'population': 5
    }
    {
      'code': 386
      'iso': 'SI'
      'name': 'Slovenia'
      'population': 2
    }
    {
      'code': 677
      'iso': 'SB'
      'name': 'Solomon Islands'
      'population': 0
    }
    {
      'code': 252
      'iso': 'SO'
      'name': 'Somalia'
      'population': 10
    }
    {
      'code': 27
      'iso': 'ZA'
      'name': 'South Africa'
      'population': 54
    }
    {
      'code': 82
      'iso': 'KR'
      'name': 'South Korea'
      'population': 48
    }
    {
      'code': 211
      'iso': 'SS'
      'name': 'South Sudan'
      'population': 8
    }
    {
      'code': 34
      'iso': 'ES'
      'name': 'Spain'
      'population': 46
    }
    {
      'code': 94
      'iso': 'LK'
      'name': 'Sri Lanka'
      'population': 21
    }
    {
      'code': 249
      'iso': 'SD'
      'name': 'Sudan'
      'population': 35
    }
    {
      'code': 597
      'iso': 'SR'
      'name': 'Suriname'
      'population': 0
    }
    {
      'code': 47
      'iso': 'SJ'
      'name': 'Svalbard and Jan Mayen'
      'population': 0
    }
    {
      'code': 268
      'iso': 'SZ'
      'name': 'Swaziland'
      'population': 1
    }
    {
      'code': 46
      'iso': 'SE'
      'name': 'Sweden'
      'population': 9
    }
    {
      'code': 41
      'iso': 'CH'
      'name': 'Switzerland'
      'population': 8
    }
    {
      'code': 963
      'iso': 'SY'
      'name': 'Syria'
      'population': 22
    }
    {
      'code': 886
      'iso': 'TW'
      'name': 'Taiwan'
      'population': 22
    }
    {
      'code': 992
      'iso': 'TJ'
      'name': 'Tajikistan'
      'population': 7
    }
    {
      'code': 255
      'iso': 'TZ'
      'name': 'Tanzania'
      'population': 41
    }
    {
      'code': 66
      'iso': 'TH'
      'name': 'Thailand'
      'population': 67
    }
    {
      'code': 228
      'iso': 'TG'
      'name': 'Togo'
      'population': 6
    }
    {
      'code': 690
      'iso': 'TK'
      'name': 'Tokelau'
      'population': 0
    }
    {
      'code': 676
      'iso': 'TO'
      'name': 'Tonga'
      'population': 0
    }
    {
      'code': 1868
      'iso': 'TT'
      'name': 'Trinidad and Tobago'
      'population': 1
    }
    {
      'code': 216
      'iso': 'TN'
      'name': 'Tunisia'
      'population': 10
    }
    {
      'code': 90
      'iso': 'TR'
      'name': 'Turkey'
      'population': 77
    }
    {
      'code': 993
      'iso': 'TM'
      'name': 'Turkmenistan'
      'population': 4
    }
    {
      'code': 1649
      'iso': 'TC'
      'name': 'Turks and Caicos Islands'
      'population': 0
    }
    {
      'code': 688
      'iso': 'TV'
      'name': 'Tuvalu'
      'population': 0
    }
    {
      'code': 1340
      'iso': 'VI'
      'name': 'U.S. Virgin Islands'
      'population': 0
    }
    {
      'code': 256
      'iso': 'UG'
      'name': 'Uganda'
      'population': 33
    }
    {
      'code': 380
      'iso': 'UA'
      'name': 'Ukraine'
      'population': 45
    }
    {
      'code': 971
      'iso': 'AE'
      'name': 'United Arab Emirates'
      'population': 4
    }
    {
      'code': 44
      'iso': 'GB'
      'name': 'United Kingdom'
      'population': 65
    }
    {
      'code': 1
      'iso': 'US'
      'name': 'United States'
      'population': 324
    }
    {
      'code': 598
      'iso': 'UY'
      'name': 'Uruguay'
      'population': 3
    }
    {
      'code': 998
      'iso': 'UZ'
      'name': 'Uzbekistan'
      'population': 27
    }
    {
      'code': 678
      'iso': 'VU'
      'name': 'Vanuatu'
      'population': 0
    }
    {
      'code': 379
      'iso': 'VA'
      'name': 'Vatican'
      'population': 0
    }
    {
      'code': 58
      'iso': 'VE'
      'name': 'Venezuela'
      'population': 26
    }
    {
      'code': 84
      'iso': 'VN'
      'name': 'Vietnam'
      'population': 91
    }
    {
      'code': 681
      'iso': 'WF'
      'name': 'Wallis and Futuna'
      'population': 0
    }
    {
      'code': 212
      'iso': 'EH'
      'name': 'Western Sahara'
      'population': 0
    }
    {
      'code': 967
      'iso': 'YE'
      'name': 'Yemen'
      'population': 24
    }
    {
      'code': 260
      'iso': 'ZM'
      'name': 'Zambia'
      'population': 16
    }
    {
      'code': 263
      'iso': 'ZW'
      'name': 'Zimbabwe'
      'population': 12
    }
  ]

  return {
    get_country_code: get_country_code
    get_country_name: get_country_name
    get_country_by_code: get_country_by_code
    COUNTRY_CODES: COUNTRY_CODES
  }
