define([
    './core/DOMTransform',
    './core/ModelValue',
    './model'
], function(
    DOMTransform,
    ModelValue,
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

    return Controller;
});
