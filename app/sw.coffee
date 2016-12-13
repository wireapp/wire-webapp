self.addEventListener 'install', (event) ->
  console.debug 'service worker installed'

self.addEventListener 'fetch', (event) ->
  console.debug 'fetch'
  console.debug event.request.url
  event.respondWith(fetch(event.request))
