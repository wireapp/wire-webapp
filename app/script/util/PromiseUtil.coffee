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
z.util.PromiseUtil ?= {}

z.util.PromiseUtil.execute_all = (promises) ->
  resolvingPromises = promises.map((promise) ->
    new Promise((resolve) ->
      payload = new Array(2)
      promise.then((result) ->
        payload[0] = result
      ).catch((error) ->
        payload[1] = error
      ).then ->
        resolve payload
    )
  )

  errors = []
  results = []

  Promise.all(resolvingPromises).then (items) ->
    items.forEach (payload) ->
      if payload[1]
        errors.push payload[1]
      else
        results.push payload[0]

    return {
      errors: errors
      results: results
    }
