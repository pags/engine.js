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
                if (!newNode.firstChild) {
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

    function CancellationError() {
        this.name = 'CancellationError';
        this.message = ' ';
    }

    CancellationError.prototype = Object.create(Error.prototype);
    CancellationError.prototype.constructor = CancellationError;

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

        var events = this.events,
            self = this;

        if (events) {
            var manualHandlers = this.manualHandlers = [];

            Object.keys(events).forEach(function(k) {
                var i = k.indexOf(' '),
                    type = k.substring(0, i);

                manualHandlers.push({
                    type: type,
                    selector: k.substring(i + 1, k.length),
                    handler: events[k].bind(self)
                });
            });
        }

        this._changeListenerDestroyFunctions = [];
        this._manualListenerDestroyFunctions = [];
        this._children = [];
        this._data = Object.freeze({});
    }

    Controller.prototype = {

        render: function(cb) {
            try {
                if (this._destroyed) {
                    throw new Error('Cannot call `render` on a destroyed Controller');
                }

                var datasources = this.datasources,
                    self = this,
                    newData = {};

                if (this._pending) {
                    this._pending.cancelled = true;
                }

                var pending = this._pending = {};

                self._changeListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                self._manualListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                var changeListenerDestroyFunctions = self._changeListenerDestroyFunctions = [];

                self._manualListenerDestroyFunctions = [];

                function completer(error) {
                    if (!error) {
                        self._built = true;
                    }

                    if (cb) {
                        cb(error);
                    }
                }

                var callBacks;

                if (datasources) {
                    datasources = (datasources instanceof Array && datasources) || [datasources];

                    callBacks = new Array(datasources.length);

                    datasources.forEach(function(source, i) {
                        callBacks[i] = function(dsCb) {
                            var sourceKeys = Object.keys(source),
                                results = new Array(sourceKeys.length),
                                c = 0;

                            sourceKeys.forEach(function(sourceKey, k) {
                                var sourceResult = source[sourceKey].call(self, newData);

                                function resultResolver(mr) {
                                    try {
                                        results[k] = mr;

                                        if (++c === sourceKeys.length) {
                                            results.forEach(function(result, j) {
                                                var modelKey = result instanceof ModelValue && result.key;

                                                if (typeof modelKey === 'string') {
                                                    changeListenerDestroyFunctions.push(model.observe(modelKey, function() {
                                                        if (!self._destroyed) {
                                                            self.render();
                                                        }
                                                    }));

                                                    result = result.value;
                                                }

                                                newData[sourceKeys[j]] = result;
                                            });

                                            dsCb();
                                        }
                                    } catch (e) {
                                        // TODO short circuit
                                        dsCb(e);
                                    }
                                }

                                if (sourceResult && typeof sourceResult.then === 'function') {
                                    sourceResult.then(function(result) {
                                        if (!pending.cancelled && !self._destroyed) {
                                            resultResolver(result);
                                        } else {
                                            // TODO short circuit
                                            dsCb(new CancellationError());
                                        }
                                    });
                                } else {
                                    resultResolver(sourceResult);
                                }
                            });
                        };
                    });
                }

                (function reducer(error) {
                    if (error) {
                        completer(error);
                    } else if (callBacks && callBacks.length) {
                        callBacks.shift()(reducer);
                    } else {
                        self._data = Object.freeze(newData);
                        self._pending = null;
                        self._transform(self.el);
                        self._initializeEvents();

                        if (!self._built) {
                            var children = self._createChildren();

                            if (children) {
                                if (!(children instanceof Array)) {
                                    children = [children];
                                }

                                var count = 0;

                                children.forEach(function(child, i) {
                                    if (!child._selector) {
                                        throw new Error('Child controller root elements must be initialized with a string selector and not an element reference!');
                                    } else {
                                        child.el = self.el.querySelector(child._selector);
                                    }

                                    child.render(function(childError) {
                                        if (childError) {
                                            completer(childError);

                                            // TODO short circuit
                                        } else if (++count === children.length) {
                                            completer();
                                        }
                                    });

                                    self._children.push(child);
                                });
                            } else {
                                completer();
                            }
                        } else {
                            completer();
                        }
                    }
                }());
            } catch (e) {
                completer(e);
            }
        },

        generateHTML: function(data) {
            throw new Error('Controller.generateHTML must be implemented');
        },

        detach: function() {
            if (this.el) {
                this._changeListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                this._manualListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                this._children.forEach(function(child) {
                    child.detach();
                });

                this.el.parentNode.removeChild(this.el);

                this.el = null;
            }

            return this;
        },

        destroy: function() {
            if (!this._destroyed) {
                if (this._destroyables) {
                    this._destroyables.forEach(function(destroy) {
                        destroy();
                    });
                }

                this._changeListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                this._manualListenerDestroyFunctions.forEach(function(destroy) {
                    destroy();
                });

                this._children.forEach(function(child) {
                    child.destroy();
                });

                this._children = null;

                this.el.parentNode.removeChild(this.el);

                this.el = null;

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

        _createChildren: function() {},

        _initializeEvents: function() {
            if (this.manualHandlers) {
                var manualListenerDestroyFunctions = this._manualListenerDestroyFunctions,
                    el = this.el,
                    children = this._children;

                this.manualHandlers.forEach(function(handler) {
                    var elements = el.querySelectorAll(handler.selector);

                    if (children && children.length) {
                        elements = Array.prototype.filter.call(elements, function(node) {
                            while (node) {
                                if (node === el) {
                                    return true;
                                } else {
                                    var l = children.length;

                                    while (l--) {
                                        if (children[l].el === node) {
                                            return false;
                                        }
                                    }
                                }

                                node = node.parentNode;
                            }
                        });
                    }

                    Array.prototype.forEach.call(elements, function(selected) {
                        selected.addEventListener(handler.type, handler.handler);

                        manualListenerDestroyFunctions.push(function() {
                            selected.removeEventListener(handler.type, handler.handler);
                        });
                    });
                });
            }
        },

        _transform: function(el) {
            if (el) {
                var newEl = document.createElement('body'),
                    closingTag = '</' + this.el.tagName.toLowerCase() + '>',
                    html = this.el.outerHTML.replace(this.el.innerHTML + closingTag, this.generateHTML(this._data) + closingTag);

                newEl.innerHTML = html;

                var l = this._children.length;

                while (l--) {
                    var child = this._children[l],
                        newChildEl = newEl.querySelector(child._selector);

                    if (newChildEl && !child.el) {
                        child.el = newChildEl;
                    } 

                    if (!child._transform(newChildEl)) {
                        child.detach();
                    }
                }

                DOMTransform(newEl.childNodes[0], el);

                var childrenToProcess = this._children,
                    newChildrenToProcess;

                while (childrenToProcess.length) {
                    newChildrenToProcess = [];

                    childrenToProcess.forEach(function(c) {
                        if (c.el) {
                            c.el = el.querySelector(c._selector);
                            c._manualListenerDestroyFunctions.forEach(function(destroy) {
                                destroy();
                            });
                            c._initializeEvents();

                            newChildrenToProcess = newChildrenToProcess.concat(c._children);
                        }
                    });

                    childrenToProcess = newChildrenToProcess;
                }

                return true;
            }
        }

    };

    var curvilinear = {

        DOMTransform: DOMTransform,

        ModelValue: ModelValue,

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
