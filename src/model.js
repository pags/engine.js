define([
    './core/ModelValue'
], function(
    ModelValue
) {
    var DEFAULT_STORE = 'memory',
        stores = {
            memory: {

                _storage: {},

                get: function(key, cb) {
                    cb(null, this._storage[key]);
                },

                set: function(key, value, cb) {
                    this._storage[key] = value;

                    cb(null);
                },

                destroy: function(key, cb) {
                    delete this._storage[key];

                    cb(null);
                }

            }
        },
        changeListeners = {},
        storesForKey = {};

    return {

        stores: stores,

        registerStoreForKey: function(options) {
            var key = options.key,
                storeName = options.store;

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

        get: function(key, cb) {
            (stores[storesForKey[key] || DEFAULT_STORE]).get(key, function(error, value) {
                if (cb) {
                    if (error) {
                        cb(error);
                    } else {
                        cb(null, new ModelValue(key, value))
                    }
                }
            });

            return this;
        },

        set: function(key, value, cb) {
            if (typeof key !== 'string') {
                throw new TypeError('model.set only accepts key of type "string"');
            }

            value = JSON.parse(JSON.stringify(value));

            var self = this;

            (stores[storesForKey[key] || DEFAULT_STORE]).set(key, value, function(error) {
                if (!error) {
                    Object.freeze(value);

                    self.trigger(key, value);
                }

                if (cb) {
                    cb(error);
                }
            });

            return this;
        },

        destroy: function(key, cb) {
            var self = this;

            (stores[storesForKey[key] || DEFAULT_STORE]).destroy(key, function(error) {
                if (!error) {
                    self.trigger(key);
                }

                if (cb) {
                    cb(error);
                }
            });

            return this;
        },

        trigger: function(key, value) {
            var watchersForNamespace = changeListeners[key];

            if (watchersForNamespace) {
                watchersForNamespace = watchersForNamespace.slice();

                setTimeout(function() {
                    watchersForNamespace.forEach(function(watcher) {
                        watcher(value);
                    });
                }, 0);
            }
        }

    };
});
