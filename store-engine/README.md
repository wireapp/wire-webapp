# Wire

This repository is part of the source code of Wire. You can find more information at [wire.com](https://wire.com) or by contacting opensource@wire.com.

You can find the published source code at [github.com/wireapp](https://github.com/wireapp).

For licensing information, see the attached LICENSE file and the list of third-party licenses at [wire.com/legal/licenses/](https://wire.com/legal/licenses/).

## Store Engine

Provider for the following storage engines: File, IndexedDB, Memory & LocalStorage.

### Motivation

#### One API to rule them all!

![big deal](https://user-images.githubusercontent.com/469989/28491995-c5f0ea34-6efa-11e7-97d1-2f8b1d159981.jpg)

Nowadays there are more and more storage possibilities and developers must be familiar with the characteristics of each individual solution to reliably store data. Because it can be sometimes hard to keep up with the highly dynamic world of data storages, we have developed a system which unifies the usage of [IndexedDB](https://developer.mozilla.org/docs/IndexedDB), [In-memory storage](https://en.wikipedia.org/wiki/In-memory_database), [File-based storage](https://nodejs.org/api/fs.html) and [LocalStorage](https://developer.mozilla.org/docs/Web/API/Window/localStorage). In addition we built some functionality (like a transient store which deletes data after a [TTL](https://en.wikipedia.org/wiki/Time_to_live)) on top.

### Overview

<!-- prettier-ignore -->
Engine | Available in Browser | Available in Node.js | Description
:---|:---:|:---:|:---
FileEngine | ❌ | ✔ | Rudimentary persistent store based on files. Very generic and easy to read.
IndexedDBEngine | ✔ | ❌ | Persisent storage which handles significant amounts of structured data, including files/blobs. Enables very fast searches.
MemoryEngine | ✔ | ✔ | Transient store which loses data on application restart. Suitable for testing environments.
LocalStorageEngine | ✔ | ❌ | Can save very small amount of data. Stored data is saved across browser sessions. Suitable for simple objects and strings.

### Quickstart

#### Engines

##### Hooking up a FileEngine

```javascript
const {StoreEngine} = require('@wireapp/store-engine');
const engine = new StoreEngine.FileEngine('C:\tempmy-favorite-actors');
```

##### Hooking up a IndexedDBEngine

```javascript
import Dexie from 'dexie';

const db = new Dexie('my-favorite-actors');
db.version(1).stores({
  'the-simpsons': ',name',
});

const {StoreEngine} = require('@wireapp/store-engine');
const engine = new StoreEngine.IndexedDBEngine(db);
```

##### Hooking up a MemoryEngine

```javascript
const {StoreEngine} = require('@wireapp/store-engine');
const engine = new StoreEngine.MemoryEngine('my-favorite-actors');
```

##### Hooking up a LocalStorageEngine

```javascript
const {StoreEngine} = require('@wireapp/store-engine');
const engine = new StoreEngine.LocalStorageEngine('my-favorite-actors');
```

#### Stores

With an engine you can build a store which has special capabilities like a timeout.

**Using a TransientStore**

```javascript
const {Store, StoreEngine} = require('@wireapp/store-engine');

const engine = new StoreEngine.LocalStorageEngine('my-favorite-actors');
const store = new Store.TransientStore(engine);

store
  .init('the-simpsons')
  .then(() => store.set('bart', {name: 'Bart Simpson'}, 1000))
  .then(transientBundle => {
    console.log(`The record of "${transientBundle.payload.name}" will expires in "${transientBundle.expires}"ms.`);
  });
```

### API

No matter what engine you use, all [CRUD operations](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete) work the same. 🙂

In the following examples this data is used:

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

#### read

```javascript
engine.read(TABLE_NAME, PRIMARY_KEY).then(record => {
  console.log(`Her name is "${record.name}".`);
});
```

#### readAll

```javascript
engine.readAll(TABLE_NAME).then(records => {
  console.log(`There are "${record.length}" Simpsons in our database.`);
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
