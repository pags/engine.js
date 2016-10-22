describe('model', function() {
    var expect = window.chai.expect,
        model = window.curvilinear.model;

    it('returns a dummy object with a change function when no data is set', function(done) {
        model.get('foo', function(error, mv) {
            expect(typeof mv).to.equal('object');

            done();
        });
    });

    it('enforces keys be of type "string"', function(done) {
        expect(function() {
            model.set({}, 'bar');
        }).to.throw(TypeError);

        done();
    });

    it('allows setting values', function(done) {
        var value = {
            bar: 'baz'
        };

        model.set('foo', value);

        value.hello = 'world';

        expect(value.hello).to.equal('world');

        done();
    });

    it('batches set', function(done) {
        var destroy = model.observe('foo2', function(value) {
            destroy();

            if (value.items.length !== 2) {
                done(new Error('model did not batch sets'));
            } else {
                done();
            }
        });

        model.set('foo2', {
            items: [1]
        });

        model.set('foo2', {
            items: [1, 2]
        });
    });

    it('batches destroy (first)', function(done) {
        var destroy = model.observe('foo2', function(value) {
            destroy();

            if (value.items.length !== 2) {
                done(new Error('model did not batch destroy'));
            } else {
                done();
            }
        });

        model.destroy('foo2');

        model.set('foo2', {
            items: [1, 2]
        });
    });

    it('batches destroy (last)', function(done) {
        var destroy = model.observe('foo2', function(value) {
            destroy();

            if (value) {
                done(new Error('model did not batch destroy'));
            } else {
                done();
            }
        });

        model.set('foo2', {
            items: [1, 2]
        });

        model.destroy('foo2');
    });

    it('returns appropriate values', function(done) {
        model.get('foo', function(error, mv) {
            var value = mv.value;

            expect(value.bar).to.equal('baz');
            expect(value.hello).to.be.undefined;

            value.hello = 'world';

            expect(value.hello).to.be.undefined;

            model.get('foo', function(error, mv2) {
                expect(mv2.value.hello).to.be.undefined;

                done();
            });
        });
    });

    it('notifies change watchers', function(done) {
        model.get('foo', function(error, mv) {
            var value = mv.value,
                remove = model.observe('foo', function(newValue) {
                    try {
                        remove();

                        expect(newValue.bar).to.equal('baz');
                        expect(newValue.hello).to.equal('world');
                        expect(newValue.foo).to.be.undefined;

                        done();
                    } catch (e) {
                        done(e);
                    }
                });

            model.set('foo', {
                bar: 'baz',
                hello: 'world'
            });
        });
    });

    it('allows destruction of values', function(done) {
        model.destroy('foo', function() {
            model.get('foo', function(error, mv) {
                expect(mv.value).to.be.undefined;

                done();
            });
        });
    });

    it('disallows the registration of invalid stores', function(done) {
        expect(function() {
            model.registerStore('foo', {
                get: true,
                set: 1
            });
        }).to.throw;

        done();
    });

    it('allows the registration of valid stores', function(done) {
        var someStoreStorage = {};

        model.registerStore('someStore', {

            get: function(value, cb) {
                cb(null, someStoreStorage[value]);

                return this;
            },

            set: function(key, value, cb) {
                someStoreStorage[key] = value;

                cb();

                return this;
            },

            destroy: function(key) {
                delete someStoreStorage[key];

                cb();

                return this;
            }

        });

        done();
    });

    it('disallows the registration of keys to unknown stores', function(done) {
        expect(function() {
            model.registerStoreForKey({
                key: 'witch',
                store: 'whatever'
            });
        }).to.throw;

        done();
    });

    it('allows the registration of keys to known stores', function(done) {
        model.registerStoreForKey({
            key: 'witch',
            store: 'someStore'
        });

        model.set('witch', {
            seer: true
        }, function() {
            model.get('witch', function(error, mv) {
                expect(mv.value.seer).to.equal(true);

                done();
            });
        });
    });
});
