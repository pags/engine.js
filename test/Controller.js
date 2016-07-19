describe('Controller', function() {
    var Q = window.Q,
        expect = window.chai.expect,
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
            this.start();
        },

        'blur input': function(e) {
            model.set('foo', {
                bar: 'heynow'
            });
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
            var deferred = Q.defer();

            setTimeout(function() {
                deferred.resolve({
                    title: 'hello world'
                });
            }, 100);

            return deferred.promise;
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

        var c = new TestController('#controller');

        expect(c.el).to.equal(el);

        c.destroy();

        done();
    });

    it('takes elements', function(done) {
        createEl();

        var c = new TestController(el);

        expect(c.el).to.equal(el);

        c.destroy();

        done();
    });

    it('renders initially for a single group of datasources', function(done) {
        createEl();

        model.set('foo', {
            bar: 'baz'
        });

        TestController.prototype.datasources = {
            foo: function() {
                return Q.ninvoke(model, 'get', 'foo');
            }
        };

        finalInstance = new TestController(el);

        finalInstance.start(function(error) {
            if (error) {
                done(error);
            }

            try {
                expect(el.innerHTML).to.equal('<div><div>baz</div><div></div><div></div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        });
    });

    it('renders initially for a queue of groups of datasources', function(done) {
        TestController.prototype.datasources = [{
            asyncSource: function() {
                var deferred = Q.defer();

                setTimeout(function() {
                    deferred.resolve({
                        title: 'hello world'
                    });
                }, 1);

                return deferred.promise;
            }
        }, {
            foo: function(data) {
                expect(data.asyncSource.title).to.equal('hello world');

                return Q.ninvoke(model, 'get', 'foo');
            },

            input: function() {
                return this.el.querySelector('input').value;
            }
        }];

        finalInstance.start(function(error) {
            if (error) {
                done(error);
            }

            try {
                expect(el.innerHTML).to.equal('<div><div>baz</div><div>hello world</div><div></div><input type="text"></div>');

                done();
            } catch (error) {
                done(error);
            }
        });
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
        }, 20);
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
        }, 10);
    });

    it('cancels pending rendering', function(done) {
        var stalledDeferred = Q.defer(),
            count = 0;

        function StalledController() {
            TestController.apply(this, arguments);
        }

        StalledController.prototype = Object.create(TestController.prototype);

        StalledController.prototype.datasources = {

            foo: function() {
                return count++ === 0 ? stalledDeferred.promise : 1;
            }

        };

        var stalledEl = document.createElement('div');

        stalledEl.style.display = 'none';

        document.body.appendChild(stalledEl);

        var stalledInstance = new StalledController(stalledEl);

        stalledInstance.start(function(error) {
            if (error) {
                done(error);
            } else {
                done(new Error('Stalled instance not cancelled.'));
            }
        });

        stalledInstance.start(function() {
            stalledDeferred.resolve({
                bar: 'baz'
            });

            setTimeout(done, 10);
        });
    });

    it('destroys', function(done) {
        finalInstance.destroy();

        expect(finalInstance.start.bind(finalInstance)).to.throw(Error);

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

        parentInstance.children = {

            '#test-child': function(e) {
                return childInstance = new TestChildController(e);
            }

        };

        parentInstance.start(function(error) {
            if (error) {
                done(error);
            }

            try {
                expect(el.innerHTML).to.equal('<div id="test-child"><input id="child-input" type="text"></div>');

                parentInstance.start(function(error) {
                    if (error) {
                        done(error);
                    }

                    try {
                        expect(el.innerHTML).to.equal('<div id="test-child"><input id="child-input" type="text"></div>');

                        done();
                    } catch (error) {
                        done(error);
                    }
                });
            } catch (error) {
                done(error);
            }
        });
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

        done();
    });

    it('properly destroys children', function(done) {
        parentInstance.destroy();

        expect(childInstance.start.bind(childInstance)).to.throw(Error);

        done();
    });

    it('manages modelkeys correctly', function(done) {
        createEl();

        function Child() {
            Controller.apply(this, arguments);
        }

        Child.prototype = Object.create(Controller.prototype);

        Child.prototype.datasources = {
            test: function() {
                return Q.ninvoke(model, 'get', 'test');
            }
        };

        Child.prototype.generateHTML = function(data) {
            return '<div>' + data.test + '</div>';
        };


        function Application() {
            Controller.apply(this, arguments);
        }

        Application.prototype = Object.create(Controller.prototype);

        Application.prototype.generateHTML = function() {
            return '<div id="child"></div>';
        };

        Application.prototype.children = {

            '#child': function(e) {
                return new Child(e);
            }

        };

        new Application(el).start();

        model.set('test', 'foo');

        setTimeout(function() {
            try {
                expect(el.innerHTML).to.equal('<div id="child"><div>foo</div></div>');

                done();
            } catch (error) {
                done(error);
            }
        }, 10);
    });

    it('optimizes rendering of child controllers', function(done) {
        createEl();

        TestController.prototype.datasources = {
            foo: function() {
                return Q.ninvoke(model, 'get', 'foo');
            },
            bar: function() {
                return Q.ninvoke(model, 'get', 'bar');
            },
            longrun: function() {
                var deferred = Q.defer();

                setTimeout(function() {
                    deferred.resolve(true);
                }, 1);

                return deferred.promise;
            }
        };

        parentInstance = new TestController(el);

        TestChildController.prototype.datasources = {
            foo: function() {
                return Q.ninvoke(model, 'get', 'foo');
            }
        };

        var originalRender = TestChildController.prototype.start,
            childCount = 0,
            subChildCount = 0;

        TestChildController.prototype.start = function() {
            childCount++;

            return originalRender.apply(this, arguments);
        };

        function SubTestController() {
            TestController.apply(this, arguments);
        }

        SubTestController.prototype = Object.create(TestController.prototype);

        SubTestController.prototype.start = function() {
            subChildCount++;

            return originalRender.apply(this, arguments);
        };

        TestChildController.prototype.generateHTML = function(data) {
            return '<input id="child-input" type="text"><div id="subchild"></div>"';
        };

        TestChildController.prototype.children = {

            '#subchild': function(e) {
                return subChildInstance = new SubTestController(e);
            }

        };

        parentInstance.children = {

            '#test-child': function(e) {
                return childInstance = new TestChildController(e);
            }

        };

        parentInstance.start(function(error) {
            if (error) {
                done(error);
            }

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
                    }, 5);
                } catch (error) {
                    done(error);
                }
            }, 10);
        });
    });

});
