window.z ?= {}
z.links ?= {}

z.links.LinkPreviewBlackList = do ->

  BLACKLIST = [
    'soundcloud'
    'spotify'
    'youtu[.]?be'
    'vimeo'
  ]

  is_blacklisted = (url) ->
    regex = new RegExp BLACKLIST.join('|')
    return regex.test url

  return {
    is_blacklisted: is_blacklisted
  }
