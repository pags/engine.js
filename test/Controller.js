describe('Controller', function() {
    var expect = window.chai.expect,
        CurvilinearPromise = window.curvilinear.Promise,
        Controller = window.curvilinear.Controller,
        model = window.curvilinear.model,
        el,
        finalInstance,
        parentInstance,
        childInstance;

    function createEl() {
        el = document.createElement('div');
        el.id = 'controller';
        el.style.display = 'none';

        document.body.appendChild(el);
    }

    var TestController = function() {
        Controller.apply(this, arguments);
    };

    TestController.prototype = Object.create(Controller.prototype);

    TestController.prototype.events = {

        'change input': function(e) {
            this.render();
        }

    };

    TestController.prototype.generateHTML = function(data) {
        return '<div><div>' + data.foo.bar + '</div><div>' + (data.asyncSource ? data.asyncSource.title : '') + '</div><div>' + (data.input || '') + '</div><input type="text"></div>';
    };

    var TestChildController = function() {
        TestController.apply(this, arguments);
    };

    TestChildController.prototype = Object.create(TestController.prototype);

    TestChildController.prototype.datasources = {
        foo: function() {
            var promise = new CurvilinearPromise();

            setTimeout(function() {
                promise.fulfill({
                    title: 'hello world'
                });
            }, 100);

            return promise;
        }
    };

    TestChildController.prototype.generateHTML = function(data) {
        return '<input id="child-input" type="text">';
    };

    it('throws when an element or selector is not specified', function(done) {
        expect(function() {
            new TestController();
        }).to.throw(TypeError);

        done();
    });

    it('throws when a selector is specified that matches no elements', function(done) {
        expect(function() {
            new TestController('blah');
        }).to.throw(Error);

        done();
    });

    it('takes element selectors', function(done) {
        createEl();

        expect(new TestController('#controller').destroy().el).to.equal(el);

        done();
    });

    it('takes elements', function(done) {
        createEl();

        expect(new TestController(el).destroy().el).to.equal(el);

        done();
    });

    it('renders initially for a single group of datasources', function(done) {
        createEl();

        model.set('foo', {
            bar: 'baz'
        });

        TestController.prototype.datasources = {
            foo: function() {
                return model.get('foo');
            }
        };

        finalInstance = new TestController(el);

        finalInstance.render().then(function() {
            try {
                expect(el.innerHTML).to.equal('<div><div>baz</div><div></div><div></div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        }, done);
    });

    it('renders initially for a queue of groups of datasources', function(done) {
        TestController.prototype.datasources = [{
            asyncSource: function() {
                var promise = new CurvilinearPromise();

                setTimeout(function() {
                    promise.fulfill({
                        title: 'hello world'
                    });
                }, 1);

                return promise;
            }
        }, {
            foo: function(data) {
                expect(data.asyncSource.title).to.equal('hello world');

                return model.get('foo');
            },

            input: function() {
                return this.el.querySelector('input').value;
            }
        }];

        finalInstance.render().then(function() {
            try {
                expect(el.innerHTML).to.equal('<div><div>baz</div><div>hello world</div><div></div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        }, done);
    });

    it('automatically re-renders when datasources change', function(done) {
        model.set('foo', {
            bar: 'witch'
        });

        setTimeout(function() {
            try {
                expect(el.innerHTML).to.equal('<div><div>witch</div><div>hello world</div><div></div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        }, 50);
    });

    it('allows event handling', function(done) {
        var input = el.querySelector('input');

        input.value = 'eventTest';
        input.setAttribute('value', 'eventTest');

        if (typeof document.createEvent === 'function') {
            var e = document.createEvent('HTMLEvents');

            e.initEvent('change', true, true);

            input.dispatchEvent(e);
        } else {
            input.fireEvent('onchange');
        }

        setTimeout(function() {
            try {
                expect(el.innerHTML).to.equal('<div><div>witch</div><div>hello world</div><div>eventTest</div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        }, 50);
    });

    it('cancels pending rendering', function(done) {
        var stalledPromise = new CurvilinearPromise(),
            count = 0;

        function StalledController() {
            TestController.apply(this, arguments);
        }

        StalledController.prototype = Object.create(TestController.prototype);

        StalledController.prototype.datasources = {

            foo: function() {
                return count++ === 0 ? stalledPromise : 1;
            }

        };

        var stalledEl = document.createElement('div');

        stalledEl.style.display = 'none';

        document.body.appendChild(stalledEl);

        var stalledInstance = new StalledController(stalledEl);

        stalledInstance.render().then(function() {
            done(new Error());
        }, function(error) {
            done();
        });

        stalledInstance.render().then(function() {
            stalledPromise.fulfill();
        });
    });

    it('destroys', function(done) {
        finalInstance.destroy();

        expect(finalInstance.render.bind(finalInstance)).to.throw;

        model.set('foo', {});

        expect(document.querySelector('#controller')).to.be.null;

        done();
    });

    it('allows ownership of destroyables', function(done) {
        createEl();

        new TestController(el)
            .own(function() {
                done();
            })
            .destroy();
    });

    it('allows disownership of destroyables', function(done) {
        createEl();

        function fail() {
            done(new Error());
        }

        new TestController(el)
            .own(fail)
            .disown(fail)
            .destroy();

        done();
    });

    it('allows nesting of child controllers', function(done) {
        createEl();

        TestController.prototype.datasources = {
            foo: function() {
                return 'bar';
            }
        };

        TestController.prototype.generateHTML = function(data) {
            return '<div id="test-child"></div>';
        };

        parentInstance = new TestController(el);

        parentInstance._createChildren = function(data) {
            return childInstance = new TestChildController('#test-child');
        };

        parentInstance.render().then(function() {
            try {
                expect(el.innerHTML).to.equal('<div id="test-child"><input id="child-input" type="text"></div>');

                parentInstance.render().then(function() {
                    try {
                        expect(el.innerHTML).to.equal('<div id="test-child"><input id="child-input" type="text"></div>');

                        done();
                    } catch (error) {
                        done(error);
                    }
                }, done);
            } catch (error) {
                done(error);
            }
        }, done);
    });

    it('doesn\'t respond to events dispatched from child component elements', function(done) {
        parentInstance._transform = function() {
            done(new Error('Parent component responded to child component\'s event!'));
        };

        var input = el.querySelector('#child-input');

        input.value = 'eventTest';
        input.setAttribute('value', 'eventTest');

        if (typeof document.createEvent === 'function') {
            var e = document.createEvent('HTMLEvents');

            e.initEvent('change', true, true);

            input.dispatchEvent(e);
        } else {
            input.fireEvent('onchange');
        }

        setTimeout(function() {
            done();
        }, 50);
    });

    it('properly destroys children', function(done) {
        parentInstance.destroy();

        expect(parentInstance.render.bind(parentInstance)).to.throw;
        expect(childInstance.render.bind(childInstance)).to.throw;

        done();
    });

    it('optimizes rendering of child controllers', function(done) {
        createEl();

        TestController.prototype.datasources = {
            foo: function() {
                return model.get('foo');
            },
            bar: function() {
                return model.get('bar');
            },
            longrun: function() {
                var promise = new CurvilinearPromise();

                setTimeout(function() {
                    promise.fulfill(true);
                }, 1);

                return promise;
            }
        };

        parentInstance = new TestController(el);

        TestChildController.prototype.datasources = {
            foo: function() {
                return model.get('foo');
            }
        };

        var originalRender = TestChildController.prototype.render,
            childCount = 0,
            subChildCount = 0;

        TestChildController.prototype.render = function() {
            childCount++;

            return originalRender.apply(this, arguments);
        }

        function SubTestController() {
            TestController.apply(this, arguments);
        }

        SubTestController.prototype = Object.create(TestController.prototype);

        SubTestController.prototype.render = function() {
            subChildCount++;

            return originalRender.apply(this, arguments);
        }

        TestChildController.prototype.generateHTML = function(data) {
            return '<input id="child-input" type="text"><div id="subchild"></div>"';
        };

        TestChildController.prototype._createChildren = function(data) {
            return subChildInstance = new SubTestController('#subchild');
        };

        parentInstance._createChildren = function(data) {
            return childInstance = new TestChildController('#test-child');
        };

        parentInstance.render().then(function() {
            model.set('foo', 'bar');

            setTimeout(function() {
                try {
                    expect(childCount).to.equal(2);
                    expect(subChildCount).to.equal(2);

                    model.set('bar', 'buzz');

                    setTimeout(function() {
                        try {
                            expect(subChildCount).to.equal(3);

                            done();
                        } catch (error) {
                            done(error);
                        }
                    }, 100);
                } catch (error) {
                    done(error);
                }
            }, 100)
        }, done);
    });

});
