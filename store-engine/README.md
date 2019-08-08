# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Store Engine

The Store Engine is an interface which can be used to implement various storage technologies in a uniform manner. There is a `MemoryEngine` which serves as an example. Additional implementations can be found in separate packages.

**Popular implementations**

| Store Engine | Description |
| :-- | :-- |
| [store-engine](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine) | Implementation for in-memory. |
| [store-engine-bro-fs](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine-bro-fs) | Implementation for the browser's [File and Directory Entries API](https://developer.mozilla.org/docs/Web/API/File_and_Directory_Entries_API). |
| [store-engine-dexie](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine-dexie) | Implementation for the browser's [IndexedDB](https://developer.mozilla.org/docs/IndexedDB). |
| [store-engine-fs](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine-fs) | Implementation for Node.js' [File System](https://nodejs.org/api/fs.html). |
| [store-engine-sqleet](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine-sqleet) | Implementation for [SQLite 3](https://github.com/kripken/sql.js) (WebAssembly) with [encryption](https://github.com/resilar/sqleet). |
| [store-engine-web-storage](https://github.com/wireapp/wire-web-packages/tree/master/packages/store-engine-web-storage) | Implementation for the browser's [Web Storage API](https://developer.mozilla.org/docs/Web/API/Web_Storage_API). |

### Motivation

Nowadays there are more and more storage possibilities and developers must be familiar with the characteristics of each individual solution to reliably store data. Because it can be sometimes hard to keep up with the highly dynamic world of data storages, we have developed a system which unifies the use of different storages / databases.

### Quickstart

#### Engine instantiation

```javascript
const {MemoryEngine} = require('@wireapp/store-engine');
const engine = new MemoryEngine();
await engine.init('my-database-name');
```

### API

No matter which engine you use, they all support common [CRUD operations](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete).

**Example**

The following API calls we use this data:

```javascript
const TABLE_NAME = 'the-simpsons';
const PRIMARY_KEY = 'lisa-simpson';
const ENTITY = {name: 'Lisa Simpson'};
```

#### create

```javascript
engine.create(TABLE_NAME, PRIMARY_KEY, ENTITY).then(primaryKey => {
  console.log(`Saved record with primary key "${primaryKey}".`);
});
```

#### delete

```javascript
engine.delete(TABLE_NAME, PRIMARY_KEY).then(primaryKey => {
  console.log(`Deleted record with primary key "${primaryKey}".`);
});
```

#### deleteAll

```javascript
engine.deleteAll(TABLE_NAME).then(wasDeleted => {
  if (wasDeleted) {
    console.log('The Simpsons have been deleted. Poor Simpsons!');
  }
});
```

#### purge

```javascript
engine.purge().then(() => {
  console.log('The Simpson Universe has been deleted. Doh!');
});
```

#### read

```javascript
engine.read(TABLE_NAME, PRIMARY_KEY).then(record => {
  console.log(`Her name is "${record.name}".`);
});
```

#### readAll

```javascript
engine.readAll(TABLE_NAME).then(records => {
  console.log(`There are "${records.length}" Simpsons in our database.`);
});
```

#### readAllPrimaryKeys

```javascript
engine.readAllPrimaryKeys(TABLE_NAME).then(primaryKeys => {
  console.log(`Identifiers of our Simpsons: "${primaryKeys.join(', ')}"`);
});
```

#### update

```javascript
engine.update(TABLE_NAME, PRIMARY_KEY, {brother: 'Bart Simpson'}).then((primaryKey) => {
  return engine.read(TABLE_NAME, PRIMARY_KEY);
}).then((updatedRecord) => {
  console.log(`The brother of "${updatedRecord.name}" is "${updatedRecord.brother}".`):
})
```

### Transient store

The Store Engine interface also provides a transient store which deletes data after a specified [TTL](https://en.wikipedia.org/wiki/Time_to_live).

**Example**

```javascript
const {Store} = require('@wireapp/store-engine');
const {WebStorageEngine} = require('@wireapp/store-engine-web-storage');

const engine = new WebStorageEngine();
const store = new Store.TransientStore(engine);

(async () => {
  const ttl = 1000;

  await engine.init('my-database-name');
  await store.init('the-simpsons');
  const transientBundle = await store.set('bart', {name: 'Bart Simpson'}, ttl);
  console.log(`The record of "${transientBundle.payload.name}" will expire in "${transientBundle.expires}"ms.`);
})();
```
