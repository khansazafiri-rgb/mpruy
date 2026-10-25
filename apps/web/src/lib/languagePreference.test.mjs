import assert from 'node:assert/strict';
import test from 'node:test';

test('the Indonesian-only release resets saved English preferences and rejects changes from an older tab', async () => {
  const previous = Object.fromEntries(['localStorage', 'document', 'window'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const values = new Map([['medcoel-language', 'en']]);
  const events = new Map();
  try {
    globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
    globalThis.document = { documentElement: { lang: 'en' } };
    globalThis.window = { addEventListener: (name, fn) => events.set(name, fn) };
    const store = await import('../i18n/store.js?indonesian-only');
    assert.equal(store.getLanguage(), 'id');
    assert.equal(globalThis.document.documentElement.lang, 'id');
    assert.equal(values.get('medcoel-language'), 'id');

    let observed;
    const unsubscribe = store.subscribe(() => { observed = store.getLanguage(); });
    store.setLanguage('en');
    assert.equal(store.getLanguage(), 'id');
    assert.equal(observed, 'id');
    assert.equal(globalThis.document.documentElement.lang, 'id');

    values.set('medcoel-language', 'en');
    events.get('storage')({ key: 'medcoel-language', newValue: 'en' });
    assert.equal(store.getLanguage(), 'id');
    assert.equal(values.get('medcoel-language'), 'id');
    assert.equal(globalThis.document.documentElement.lang, 'id');
    events.get('storage')({ key: null, newValue: null });
    assert.equal(store.getLanguage(), 'id');
    unsubscribe();

    globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    const blocked = await import('../i18n/store.js?blocked-persistence');
    blocked.setLanguage('en');
    assert.equal(blocked.getLanguage(), 'id');
    assert.equal(globalThis.document.documentElement.lang, 'id');
    events.get('storage')({ key: 'medcoel-language', newValue: 'en' });
    assert.equal(blocked.getLanguage(), 'id');
  } finally {
    for (const [key, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
