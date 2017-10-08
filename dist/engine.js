(function() {
    var DOMTransform = function(newNode, node, blacklist) {
        var parent = null,
            root = newNode,
            clonedNode,
            blacklisted;

        if (blacklist) {
            var keys = Object.keys(blacklist);

            blacklisted = new Array(keys.length);

            keys.forEach(function(key, i) {
                blacklisted[i] = blacklist[key].el;
            });
        }

        do {
            var ignoreChildren = false,
                isBlacklisted = false;

            if (!node) {
                clonedNode = newNode.cloneNode(true);

                parent.appendChild(clonedNode);

                node = clonedNode;

                parent = node.parentNode;

                ignoreChildren = true;
            } else if (!blacklisted || blacklisted.indexOf(node) === -1) {
                if (node.tagName === newNode.tagName) {
                    if (newNode.nodeType === 1) {
                        var name;

                        for (var attributes = Array.prototype.slice.call(node.attributes), i = 0, l = attributes.length; i < l; i++) {
                            name = attributes[i].name;

                            if (!newNode.hasAttribute(name)) {
                                node.removeAttribute(name);
                            }
                        }

                        attributes = newNode.attributes;
                        i = 0;
                        l = attributes.length;

                        for (; i < l; i++) {
                            var attribute = attributes[i],
                                value = attribute.value;

                            name = attribute.name;

                            if (node.getAttribute(name) !== value) {
                                node.setAttribute(name, value);
                            }
                        }

                        node.checked = newNode.checked;
                    } else if (newNode.nodeType === 3) {
                        node.textContent = newNode.textContent;
                    }
                } else {
                    clonedNode = newNode.cloneNode(true);

                    node.parentNode.replaceChild(clonedNode, node);

                    node = clonedNode;

                    parent = node.parentNode;

                    ignoreChildren = true;
                }
            } else {
                isBlacklisted = true;
            }

            var nextNewNode = (!ignoreChildren && newNode.firstChild);

            if (nextNewNode) {
                parent = node;

                node = node.firstChild;
            } else {
                if (!isBlacklisted && !newNode.firstChild) {
                    while (node.firstChild) {
                        node.removeChild(node.firstChild);
                    }
                }

                nextNewNode = newNode.nextSibling;

                if (nextNewNode) {
                    node = node.nextSibling;
                } else {
                    while (node.nextSibling) {
                        node.parentNode.removeChild(node.nextSibling);
                    }

                    do {
                        if (node.nextSibling) {
                            node.parentNode.removeChild(node.nextSibling);
                        }

                        node = node.parentNode;
                    } while ((newNode = newNode.parentNode) && newNode !== root && !newNode.nextSibling);

                    if (newNode === root) {
                        return;
                    }

                    parent = node.parentNode;

                    node = node.nextSibling;

                    nextNewNode = newNode && newNode.nextSibling;
                }
            }

            newNode = nextNewNode;
        } while (newNode);
    };

    var ModelValue = function(key, value) {
        this.key = key;
        this.value = value;
    };

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
        storesForKey = {},
        queue = {},
        queueChange = function(key, value) {
            if (!(key in queue)) {
                setTimeout(function() {
                    Object.freeze(queue[key]);

                    model.trigger(key, queue[key]);

                    delete queue[key];
                }, 0);
            }

            queue[key] = value;
        },
        model = {

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
                    var a = changeListeners[key];

                    if (a) {
                        var l = a.length;

                        while (l--) {
                            if (a[l] === f) {
                                a.splice(l, 1);

                                if (!a.length) {
                                    delete changeListeners[key];
                                }

                                break;
                            }
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
                            cb(null, new ModelValue(key, value));
                        }
                    }
                });

                return this;
            },

            set: function(key, value, cb) {
                if (typeof key !== 'string') {
                    throw new TypeError('model.set only accepts key of type "string"');
                }

                this.get(key, function(error, current) {
                    if (error) {
                        if (cb) {
                            cb(error);
                        }
                    } else if (current.value !== value) {
                        value = JSON.parse(JSON.stringify(value));

                        (stores[storesForKey[key] || DEFAULT_STORE]).set(key, value, function(setError) {
                            if (!setError) {
                                queueChange(key, value);
                            }

                            if (cb) {
                                cb(setError);
                            }
                        });
                    } else if (cb) {
                        cb();
                    }
                });

                return this;
            },

            destroy: function(key, cb) {
                this.get(key, function(error, current) {
                    if (error) {
                        if (cb) {
                            cb(error);
                        }
                    } else if (typeof current.value !== 'undefined') {
                        (stores[storesForKey[key] || DEFAULT_STORE]).destroy(key, function(destroyError) {
                            if (!destroyError) {
                                queueChange(key, void 0);
                            }

                            if (cb) {
                                cb(destroyError);
                            }
                        });
                    } else if (cb) {
                        cb();
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

    function Controller(el) {
        var typeofEl = typeof el;

        if (typeofEl !== 'string' && (typeofEl !== 'object' || el === null)) {
            throw new TypeError('Controller constructor only accepts non-null el of type "string" or "object"');
        }

        if (typeofEl === 'string') {
            this._selector = el;
            this.el = document.querySelector(el);
        } else {
            this.el = el;
        }

        if (this.el === null) {
            throw new Error('Could not find element for selector "' + el + '"');
        }

        this._changeListenerDestructors = {};
        this._childInstances = {};
        this._eventListeners = [];
        this._cache = {};
    }

    Controller.prototype = {

        _resolveDataSourceCollection: function(index, data, collection, cb) {
            var keys = Object.keys(collection),
                l = keys.length,
                i = 0,
                self = this,
                cache = this._cache,
                changeListenerDestructorsForIndex = this._changeListenerDestructors[index];

            if (changeListenerDestructorsForIndex) {
                changeListenerDestructorsForIndex.forEach(function(destroy) {
                    destroy();
                });
            }

            this._changeListenerDestructors[index] = changeListenerDestructorsForIndex = [];

            function check(key, result) {
                var modelKey = result instanceof ModelValue && result.key;

                if (typeof modelKey === 'string') {
                    changeListenerDestructorsForIndex.push(model.observe(modelKey, function() {
                        self.start(index);
                    }));

                    result = result.value;
                }

                data[key] = result;

                if (!cache[index]) {
                    cache[index] = {};
                }

                cache[index][key] = result;

                if (++i === l) {
                    cb();
                }
            }

            keys.forEach(function(key) {
                try {
                    var result = collection[key].call(self, JSON.parse(JSON.stringify(data)));

                    if (result && typeof result.then === 'function') {
                        result.then(function(deferredResult) {
                            check(key, deferredResult);
                        }, cb);
                    } else {
                        check(key, result);
                    }
                } catch (e) {
                    cb(e);
                }
            });
        },

        _resolveDataSources: function(resolveFrom, cb) {
            var datasources = this.datasources,
                data = {},
                self = this;

            if (datasources) {
                if (datasources instanceof Array) {
                    var i = resolveFrom,
                        l = datasources.length;

                    if (resolveFrom > 0) {
                        for (var j = 0; j < resolveFrom; j++) {
                            var cacheEntries = self._cache[j];

                            for (var key in cacheEntries) {
                                data[key] = cacheEntries[key];
                            }
                        }
                    }

                    (function iterate() {
                        self._resolveDataSourceCollection(i, data, datasources[i], function(error) {
                            if (error) {
                                cb(error);
                            } else if (++i < l) {
                                iterate();
                            } else {
                                cb(null, Object.freeze(data));
                            }
                        });
                    }());
                } else {
                    this._resolveDataSourceCollection(null, data, datasources, function(error) {
                        if (error) {
                            cb(error);
                        } else {
                            cb(null, Object.freeze(data));
                        }
                    });
                }
            } else {
                cb(null, Object.freeze(data));
            }
        },

        _attachEventHandlers: function() {
            var events = this.events;

            if (events && typeof events === 'object') {
                var childInstances = this._childInstances,
                    self = this;

                self._eventListeners.forEach(function(destroy) {
                    destroy();
                });

                Object.keys(events).forEach(function(key) {
                    var j = key.indexOf(' '),
                        type = key.substring(0, j),
                        eventTargets = self.el.querySelectorAll(key.substring(j + 1, key.length));

                    if (eventTargets) {
                        var childInstancesKeys = Object.keys(childInstances),
                            l = childInstancesKeys.length,
                            handler = function(event) {
                                var isRelevantNode = true,
                                    eventTarget = event.target;

                                if (eventTarget !== this) {
                                    while (eventTarget) {
                                        if (eventTarget === self.el) {
                                            break;
                                        } else {
                                            for (var i = 0; i < childInstancesKeys.length; i++) {
                                                if (childInstances[childInstancesKeys[i]].el === eventTarget) {
                                                    isRelevantNode = false;

                                                    break;
                                                }
                                            }
                                        }

                                        eventTarget = eventTarget.parentNode;
                                    }
                                }

                                if (isRelevantNode) {
                                    event.stopPropagation();

                                    events[key].call(self, event);
                                }
                            };

                        if (l) {
                            eventTargets = Array.prototype.filter.call(eventTargets, function(node) {
                                while (node) {
                                    if (node === self.el) {
                                        return true;
                                    } else {
                                        for (var i = 0; i < l; i++) {
                                            if (childInstances[childInstancesKeys[i]].el === node) {
                                                return false;
                                            }
                                        }
                                    }

                                    node = node.parentNode;
                                }

                                return false;
                            });
                        }

                        Array.prototype.forEach.call(eventTargets, function(selected) {
                            selected.addEventListener(type, handler);

                            self._eventListeners.push(function() {
                                selected.removeEventListener(type, handler);
                            });
                        });
                    }
                });
            }
        },

        _transform: function(target, newEl, pending, cb) {
            var childInstances = this._childInstances,
                childrenToRender = 0,
                childrenRendered = 0,
                self = this;

            DOMTransform(newEl.childNodes[0], target, childInstances);

            self.el = target;

            for (var selector in this.children) {
                var childTarget = target.querySelector(selector);

                if (childTarget) {
                    if (!childInstances[selector]) {
                        childInstances[selector] = this.children[selector].call(this, childTarget);
                        childInstances[selector]._parentPending = pending;

                        childrenToRender++;

                        childInstances[selector].start(function(error) {
                            if (error) {
                                if (cb) {
                                    cb(error);
                                }
                            } else if (++childrenRendered === childrenToRender) {
                                self._attachEventHandlers();

                                if (cb) {
                                    cb();
                                }
                            }
                        });
                    }
                } else if (childInstances[selector]) {
                    childInstances[selector].destroy();

                    delete childInstances[selector];
                }
            }

            if (!childrenToRender) {
                this._attachEventHandlers();

                if (cb) {
                    cb();
                }
            }
        },

        generateHTML: function(data) {
            throw new Error('Controller.generateHTML must be implemented');
        },

        destroy: function() {
            if (!this._destroyed) {
                if (this._destroyables) {
                    this._destroyables.forEach(function(destroy) {
                        destroy();
                    });
                }

                var key;

                for (key in this._changeListenerDestructors) {
                    this._changeListenerDestructors[key].forEach(function(destroy) {
                        destroy();
                    });
                }

                for (key in this._childInstances) {
                    this._childInstances[key].destroy();
                }

                this._eventListeners.forEach(function(destroy) {
                    destroy();
                });

                if (this.el.parentNode) {
                    this.el.parentNode.removeChild(this.el);
                }

                this._changeListenerDestructors = this._childInstances = this._eventListeners = this._cache = null;

                this._destroyed = true;
            }

            return this;
        },

        own: function(ownable) {
            if (typeof ownable !== 'function') {
                throw new TypeError('Controller.own only accepts ownable of type "function"');
            }

            this._destroyables = this._destroyables || [];

            this._destroyables.push(ownable);

            return this;
        },

        disown: function(f) {
            var destroyables = this._destroyables,
                l = destroyables.length;

            while (l--) {
                if (destroyables[l] === f) {
                    destroyables.splice(l, 1);
                }
            }

            return this;
        },

        start: function(resolveFrom, cb) {
            if (this._destroyed) {
                throw new Error('Cannot start destroyed Controller!');
            }

            if (resolveFrom && typeof resolveFrom === 'function') {
                cb = resolveFrom;
                resolveFrom = null;
            }

            var self = this;

            if (this._pending) {
                this._pending.cancelled = true;
            }

            var pending = this._pending = {};

            function complete(error) {
                self._pending = null;

                for (var key in self._childInstances) {
                    self._childInstances[key]._parentPending = null;
                }

                if (cb) {
                    cb(error);
                }
            }

            this._resolveDataSources(resolveFrom || 0, function(error, data) {
                if (pending.cancelled) {
                    return;
                }

                if (self._parentPending && self._parentPending.cancelled) {
                    pending.cancelled = true;

                    return;
                }

                if (error) {
                    complete(error);
                } else {
                    var newEl = document.createElement('body'),
                        closingTag = '</' + self.el.tagName.toLowerCase() + '>';

                    try {
                        newEl.innerHTML = self.el.outerHTML.replace(self.el.innerHTML + closingTag, self.generateHTML(data) + closingTag);

                        self._transform(self.el, newEl, pending, complete);
                    } catch (e) {
                        complete(e);
                    }
                }
            });

            return this;
        }

    };

    var engine = {

        DOMTransform: DOMTransform,

        ModelValue: ModelValue,

        Controller: Controller,

        model: model

    };

    if (typeof define === 'function' && define.amd) {
        define(function() {
            return engine;
        });
    } else {
        window.engine = engine;
    }
}());