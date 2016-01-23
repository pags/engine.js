(function() {
    var DOMTransform = function(newNode, node) {
        var parent = null,
            root = newNode,
            clonedNode;

        do {
            var ignoreChildren = false;

            if (!node) {
                clonedNode = newNode.cloneNode(true);

                parent.appendChild(clonedNode);

                node = clonedNode;

                parent = node.parentNode;

                ignoreChildren = true;
            } else if (node.tagName === newNode.tagName) {
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

            var nextNewNode = (!ignoreChildren && newNode.firstChild);

            if (nextNewNode) {
                parent = node;

                node = node.firstChild;
            } else {
                nextNewNode = newNode.nextSibling;

                if (nextNewNode) {
                    node = node.nextSibling;
                } else {
                    do {
                        if (node.nextSibling) {
                            node.parentNode.removeChild(node.nextSibling);
                        }

                        node = node.parentNode;
                    } while ((newNode = newNode.parentNode) && newNode !== root && !newNode.nextSibling);

                    if (newNode === root) {
                        return false;
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

    function CurvilinearPromise() {
        this._state = 'pending';
        this._onFulfilled = [];
        this._onRejected = [];
    }

    CurvilinearPromise.parallelize = function(promises) {
        var l = promises.length,
            values = [],
            promise = new CurvilinearPromise();

        promises.forEach(function(value, i) {
            value.then(function(answer) {
                values[i] = answer;

                if (--l === 0) {
                    promise.fulfill(values);
                }

                return answer;
            }, promise.reject.bind(promise));
        });

        return promise;
    };

    CurvilinearPromise.serialize = function(promises) {
        var l = promises.length,
            i = 0,
            values = [],
            promise = new CurvilinearPromise();

        (function next() {
            var currentPromise = promises[i++];

            (typeof currentPromise.then === 'function' ? currentPromise : currentPromise()).then(function(answer) {
                values[i] = answer;

                if (i === l) {
                    promise.fulfill(values);
                } else {
                    next();
                }
            }, promise.reject.bind(promise));
        }());

        return promise;
    };

    CurvilinearPromise.prototype = {

        then: function(onFulfilled, onRejected) {
            if (this._state === 'fulfilled') {
                if (onFulfilled) {
                    this._value = onFulfilled(this._value);
                }
            } else if (this._state === 'rejected') {
                if (onRejected) {
                    this._reason = onRejected(this._reason);
                }
            } else {
                if (onFulfilled) {
                    this._onFulfilled.push(onFulfilled);
                }

                if (onRejected) {
                    this._onRejected.push(onRejected);
                }
            }

            return this;
        },

        fulfill: function(value) {
            if (this._state === 'pending') {
                this._state = 'fulfilled';
                this._value = value;

                var self = this;

                this._onFulfilled.forEach(function(f) {
                    self._value = f(self._value);
                });
            }

            return this;
        },

        reject: function(reason) {
            if (this._state === 'pending') {
                this._state = 'rejected';
                this._reason = reason;

                var self = this;

                this._onRejected.forEach(function(f) {
                    self._reason = f(self._reason);
                });
            }

            return this;
        }

    };

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
        storesForKey = {},
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

                return (stores[storesForKey[key] || DEFAULT_STORE]).set(key, value).then(function() {
                    Object.freeze(value);

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

    function CancellationError() {
        this.name = 'CancellationError';
        this.message = ' ';
    }

    CancellationError.prototype = Object.create(Error.prototype);
    CancellationError.prototype.constructor = CancellationError;

    var crossbrowserMatches = Element.prototype.matches || Element.prototype.mozMatchesSelector || Element.prototype.webkitMatchesSelector || Element.prototype.msMatchesSelector;

    function Controller(el) {
        var typeofEl = typeof el;

        if (typeofEl !== 'string' && (typeofEl !== 'object' || el === null)) {
            throw new TypeError('Controller constructor only accepts non-null el of type "string" or "object"');
        }

        this.el = typeofEl === 'string' ? document.querySelector(el) : el;

        if (this.el === null) {
            throw new Error('Could not find element for selector "' + el + '"');
        }

        var events = this.events,
            self = this;

        if (events) {
            var eventHandlersForType = this.eventHandlersForType = {};

            Object.keys(events).forEach(function(k) {
                var i = k.indexOf(' '),
                    type = k.substring(0, i);

                function mainHandler(event) {
                    event.stopPropagation();

                    eventHandlersForType[type].forEach(function(handler) {
                        if (crossbrowserMatches.call(event.target || event.srcElement, handler.selector)) {
                            handler.handler.call(self, event);
                        }
                    });
                }

                if (!eventHandlersForType[type]) {
                    eventHandlersForType[type] = [];

                    self.el.addEventListener(type, mainHandler);

                    self.own(function() {
                        self.el.removeEventListener(type, mainHandler);
                    });
                }

                eventHandlersForType[type].push({

                    selector: k.substring(i + 1, k.length),

                    handler: events[k].bind(self)

                });
            });
        }

        this._changeListenerDestroyFunctions = [];
        this._children = [];
        this._data = Object.freeze({});
    }

    Controller.prototype = {

        render: function() {
            if (this._destroyed) {
                throw new Error('Cannot call `render` on a destroyed Controller');
            }

            var datasources = this.datasources,
                self = this,
                pending = [],
                newData = {};

            if (self._pending) {
                self._pending.cancelled = true;
            }

            self._pending = pending;

            self._changeListenerDestroyFunctions.forEach(function(destroy) {
                destroy();
            });

            var changeListenerDestroyFunctions = self._changeListenerDestroyFunctions = [];

            self._modelKeys = self._parent ? JSON.parse(JSON.stringify(self._parent._modelKeys)) : {};

            if (datasources) {
                datasources = (datasources instanceof Array && datasources) || [datasources];

                datasources.forEach(function(source) {
                    pending.push(function() {
                        var sourceKeys = Object.keys(source),
                            promises = new Array(sourceKeys.length);

                        sourceKeys.forEach(function(sourceKey, i) {
                            var sourceValue = source[sourceKey].call(self, newData);

                            if (sourceValue !== null && typeof sourceValue !== 'undefined' && typeof sourceValue.then === 'function') {
                                promises[i] = sourceValue;
                            } else {
                                var sourcePromise = new CurvilinearPromise();

                                promises[i] = sourcePromise;

                                sourcePromise.fulfill(sourceValue);
                            }
                        });

                        return CurvilinearPromise.parallelize(promises).then(function(results) {
                            if (!pending.cancelled && !self._destroyed) {
                                results.forEach(function(result, i) {
                                    var modelKey = result instanceof ModelValue && result.key;

                                    if (typeof modelKey === 'string') {
                                        self._modelKeys[modelKey] = true;

                                        if (!self._parent || !self._parent._modelKeys[modelKey]) {
                                            changeListenerDestroyFunctions.push(model.observe(modelKey, function() {
                                                if (!self._destroyed) {
                                                    self.render();
                                                }
                                            }));
                                        }

                                        result = result.value;
                                    }

                                    newData[sourceKeys[i]] = result;
                                });
                            }
                        });
                    });
                });
            } else {
                pending = [new CurvilinearPromise().fulfill()];
            }

            var mainPromise = new CurvilinearPromise();

            CurvilinearPromise.serialize(pending).then(function() {
                if (!pending.cancelled && !self._destroyed) {
                    self._data = Object.freeze(newData);
                    self._pending = null;
                    self._destroyChildren();

                    var closingTag = '</' + self.el.tagName.toLowerCase() + '>';

                    self._transform(self.el, self.el.outerHTML.replace(self.el.innerHTML + closingTag, self.generateHTML(self._data) + closingTag));

                    var children = self._createChildren(self._data);

                    if (children) {
                        if (!(children instanceof Array)) {
                            children = [children];
                        }

                        var childPromises = new Array(children.length);

                        children.forEach(function(child, i) {
                            child._parent = self;

                            childPromises[i] = child.render();

                            self._children.push(child);
                        });

                        CurvilinearPromise.parallelize(childPromises).then(mainPromise.fulfill.bind(mainPromise, mainPromise.reject.bind(mainPromise)));
                    } else {
                        mainPromise.fulfill();
                    }

                } else {
                    mainPromise.reject(new CancellationError());
                }
            });

            return mainPromise;
        },

        generateHTML: function(data) {
            throw new Error('Controller.generateHTML must be implemented');
        },

        destroy: function() {
            if (this._destroyables) {
                this._destroyables.forEach(function(destroy) {
                    destroy();
                });
            }

            this._changeListenerDestroyFunctions.forEach(function(destroy) {
                destroy();
            });

            this._destroyChildren();

            this.el.parentNode.removeChild(this.el);

            this._destroyed = true;

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

        _createChildren: function(data) {},

        _destroyChildren: function() {
            this._children.forEach(function(child) {
                child.destroy();
            });

            this._children = [];
        },

        _transform: function(el, html) {
            var newEl = document.createElement('body');

            newEl.innerHTML = html;

            DOMTransform(newEl.childNodes[0], el);
        }

    };

    var curvilinear = {

        DOMTransform: DOMTransform,

        ModelValue: ModelValue,

        Promise: CurvilinearPromise,

        Controller: Controller,

        model: model

    };

    if (typeof define === 'function' && define.amd) {
        define(function() {
            return curvilinear;
        });
    } else {
        window.curvilinear = curvilinear;
    }
}());
