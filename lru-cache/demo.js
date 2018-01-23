const LRUCache = require('./commonjs/LRUCache');

Promise.resolve()
  .then(() => {
    const capacity = 3;
    const cache = new LRUCache(capacity);
    cache.set('1', 'Apple');
    cache.set('2', 'Orange');
    cache.set('3', 'Tomato');
    cache.delete('2');
    console.log(cache.size()); // 2
    process.exit(0);
  })
  .catch(() => process.exit(1));
