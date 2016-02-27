define([
    './core/DOMTransform',
    './core/ModelValue',
    './core/Promise',
    './model'
], function(
    DOMTransform,
    ModelValue,
    CurvilinearPromise,
    model
) {
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

            self._manualListenerDestroyFunctions.forEach(function(destroy) {
                destroy();
            });

            var changeListenerDestroyFunctions = self._changeListenerDestroyFunctions = [];

            self._manualListenerDestroyFunctions = [];

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
                                        changeListenerDestroyFunctions.push(model.observe(modelKey, function() {
                                            if (!self._destroyed) {
                                                self.render();
                                            }
                                        }));

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

                    self._transform(self.el);

                    self._initializeEvents();

                    if (!self._built) {
                        var children = self._createChildren();

                        if (children) {
                            if (!(children instanceof Array)) {
                                children = [children];
                            }

                            var childPromises = new Array(children.length);

                            children.forEach(function(child, i) {
                                if (!child._selector) {
                                    throw new Error('Child controller root elements must be initialized with a string selector and not an element reference!');
                                }

                                childPromises[i] = child.render();

                                self._children.push(child);
                            });

                            CurvilinearPromise.parallelize(childPromises).then(mainPromise.fulfill.bind(mainPromise, mainPromise.reject.bind(mainPromise)));
                        } else {
                            mainPromise.fulfill();
                        }
                    } else {
                        mainPromise.fulfill();
                    }
                } else {
                    mainPromise.reject(new CancellationError());
                }
            });

            return mainPromise.then(function() {
                self._built = true;
            });
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

            this._manualListenerDestroyFunctions.forEach(function(destroy) {
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

        _createChildren: function() {},

        _destroyChildren: function() {
            this._children.forEach(function(child) {
                child.destroy();
            });

            this._children = [];
        },

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

                    var l = elements.length;

                    while (l--) {
                        var selected = elements[l];

                        selected.addEventListener(handler.type, handler.handler);

                        manualListenerDestroyFunctions.push(function() {
                            selected.removeEventListener(handler.type, handler.handler);
                        });
                    }
                });
            }
        },

        _transform: function(el) {
            if (el) {
                var newEl = document.createElement('body'),
                    closingTag = '</' + this.el.tagName.toLowerCase() + '>',
                    html = this.el.outerHTML.replace(this.el.innerHTML + closingTag, this.generateHTML(this._data) + closingTag)

                newEl.innerHTML = html;

                var l = this._children.length;

                while (l--) {
                    var child = this._children[l],
                        newChildEl = newEl.querySelector(child._selector);

                    if (!child._transform(newChildEl)) {
                        child.destroy();

                        this._children.splice(l, 1);
                    }
                }

                DOMTransform(newEl.childNodes[0], el);

                this._children.forEach(function(child) {
                    child.el = el.querySelector(child._selector);
                    child._manualListenerDestroyFunctions.forEach(function(destroy) {
                        destroy();
                    });
                    child._initializeEvents();
                });

                return true;
            }
        }

    };

    return Controller;
});
