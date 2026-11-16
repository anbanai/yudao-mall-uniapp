import assert from 'node:assert/strict';
import { createDeliveryAddressLoader } from '../sheep/helper/deliveryAddress.mjs';

let session = { isLogin: false, userId: null };
let address = { id: 'old-account' };
let fetchCount = 0;
const loader = createDeliveryAddressLoader({
  getSession: () => session,
  fetchAddresses: async () => {
    fetchCount += 1;
    return [{ id: 'default', defaultStatus: true }, { id: 'other' }];
  },
  applyAddress: (value) => {
    address = value;
  },
});

await loader.load();
assert.equal(fetchCount, 0, 'guest sessions must not request member addresses');
assert.equal(address, null, 'logging out must clear a previous member address');

session = { isLogin: true, userId: 1 };
await loader.load();
assert.equal(fetchCount, 1);
assert.equal(address.id, 'default', 'the default address should be preferred');

loader.select({ id: 'selected' });
await loader.load();
assert.equal(fetchCount, 1, 'a selected address should be reused for the same session');
assert.equal(address.id, 'selected', 'the address selection callback should be applied');

session = { isLogin: true, userId: 2 };
await loader.load();
assert.equal(fetchCount, 2, 'switching accounts must fetch that account address');
assert.equal(address.id, 'default', 'switching accounts must clear the previous selection');

let resolveOldRequest;
let resolveNewRequest;
session = { isLogin: true, userId: 4 };
const raceLoader = createDeliveryAddressLoader({
  getSession: () => session,
  fetchAddresses: () =>
    new Promise((resolve) => {
      if (!resolveOldRequest) resolveOldRequest = resolve;
      else resolveNewRequest = resolve;
    }),
  applyAddress: (value) => {
    address = value;
  },
});
const oldRequest = raceLoader.load();
session = { isLogin: true, userId: 5 };
const newRequest = raceLoader.load();
resolveNewRequest([{ id: 'new-account', defaultStatus: true }]);
await newRequest;
resolveOldRequest([{ id: 'old-account', defaultStatus: true }]);
await oldRequest;
assert.equal(
  address.id,
  'new-account',
  'a stale prior-account response must not replace the active address',
);

let rejectRequest;
session = { isLogin: true, userId: 3 };
const failedLoader = createDeliveryAddressLoader({
  getSession: () => session,
  fetchAddresses: () =>
    new Promise((_, reject) => {
      rejectRequest = reject;
    }),
  applyAddress: (value) => {
    address = value;
  },
});
address = { id: 'account-2' };
const pending = failedLoader.load();
rejectRequest(new Error('offline'));
await pending;
assert.equal(address, null, 'a failed request must not keep displaying a stale address');

console.log('delivery address session checks passed');
