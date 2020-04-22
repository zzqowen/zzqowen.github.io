import './t.json'
import './common'
import './aa'
import { openDB, deleteDB, wrap, unwrap } from 'idb';
console.log('adsjfla',idb, process.env.NODE_ENV)
const a = 344;
const b = [90,9];
b.map((item, index) => {
  console.log(item, index)
})

async function doDatabaseStuff() {
  const db = await openDB('Ljalsdfa', 1, {
    upgrade(db, oldVersion, newVersion, transaction) {

    },
    blocked() {
      // …
    },
    blocking() {
      // …
    },
  });
      
  const tx = db.transaction('keyval', 'readwrite');
  const store = tx.objectStore('keyval');
  const val = (await store.get('counter')) || 0;
  store.put(val + 1, 'counter');
  console.log(db)
  await tx.done;
}

doDatabaseStuff()