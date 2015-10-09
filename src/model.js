define([
    './core/ModelValue'
], function(
    ModelValue
) {
    var DEFAULT_STORE = 'memory',
        stores = {
            memory: {

                _storage: {},

                get: function(key) {
                    return this._storage[key];
                },

                set: function(key, value) {
                    this._storage[key] = value;
                },

                destroy: function(key) {
                    delete this._storage[key];
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
        },

        registerStore: function(name, store) {
            if (typeof store.get !== 'function' || typeof store.set !== 'function' || typeof store.destroy !== 'function') {
                throw new Error('stores must implement `get`, `set`, and `destroy` functions!');
            }

            stores[name] = store;
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
            return (stores[storesForKey[key] || DEFAULT_STORE]).get(key) || {
                key: key,
                value: void 0
            };
        },

        set: function(key, value) {
            if (typeof key !== 'string') {
                throw new TypeError('model.set only accepts key of type "string"');
            }

            value = JSON.parse(JSON.stringify(value));

            Object.freeze(value);

            stores[storesForKey[key] || DEFAULT_STORE].set(key, new ModelValue(key, value));

            var watchersForNamespace = changeListeners[key];

            if (watchersForNamespace) {
                watchersForNamespace = watchersForNamespace.slice();

                setTimeout(function() {
                    watchersForNamespace.forEach(function(watcher) {
                        watcher(value);
                    });
                }, 0);
            }
        },

        destroy: function(key) {
            stores[storesForKey[key] || DEFAULT_STORE].destroy(key);
        }

    };
});
