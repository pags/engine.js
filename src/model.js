define([
    './core/ModelValue',
    './core/Promise'
], function(
    ModelValue,
    CurvilinearPromise
) {
    var DEFAULT_STORE = 'memory',
        stores = {
            memory: {

                _storage: {},

                get: function(key) {
                    return new CurvilinearPromise().fulfill(this._storage[key]);
                },

                set: function(key, value) {
                    this._storage[key] = value;

                    return new CurvilinearPromise().fulfill();
                },

                destroy: function(key) {
                    delete this._storage[key];

                    return new CurvilinearPromise().fulfill();
                }

            }
        },
        changeListeners = {},
        storesForKey = {};

    return {

        registerStoreForKey: function(key, storeName) {
            if (typeof stores[storeName] === 'undefined') {
                throw new Error('model.registerStoreForKey passed unknown store: ' + storeName);
            }

            storesForKey[key] = storeName;

            return this;
        },

        registerStore: function(name, store) {
            if (typeof store.get !== 'function' || typeof store.set !== 'function' || typeof store.destroy !== 'function') {
                throw new Error('stores must implement `get`, `set`, and `destroy` functions!');
            }

            stores[name] = store;

            return this;
        },

        observe: function(key, f) {
            (changeListeners[key] = (changeListeners[key] || [])).push(f);

            return function remove() {
                var a = changeListeners[key],
                    l = a.length;

                while (l--) {
                    if (a[l] === f) {
                        a.splice(l, 1);

                        if (!a.length) {
                            delete changeListeners[key];
                        }

                        break;
                    }
                }
            };
        },

        get: function(key) {
            return (stores[storesForKey[key] || DEFAULT_STORE]).get(key).then(function(value) {
                return new ModelValue(key, value);
            });
        },

        set: function(key, value) {
            if (typeof key !== 'string') {
                throw new TypeError('model.set only accepts key of type "string"');
            }

            value = JSON.parse(JSON.stringify(value));

            Object.freeze(value);

            return (stores[storesForKey[key] || DEFAULT_STORE]).set(key, value).then(function() {
                var watchersForNamespace = changeListeners[key];

                if (watchersForNamespace) {
                    watchersForNamespace = watchersForNamespace.slice();

                    setTimeout(function() {
                        watchersForNamespace.forEach(function(watcher) {
                            watcher(value);
                        });
                    }, 0);
                }
            });
        },

        destroy: function(key) {
            return (stores[storesForKey[key] || DEFAULT_STORE]).destroy(key);
        }

    };
});
