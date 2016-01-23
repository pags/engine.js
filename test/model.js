describe('model', function() {
    var expect = window.chai.expect,
        model = window.curvilinear.model,
        CurvilinearPromise = window.curvilinear.Promise;

    it('returns a dummy object with a change function when no data is set', function(done) {
        model.get('foo').then(function(mv) {
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

    it('returns appropriate values', function(done) {
        model.get('foo').then(function(mv) {
            var value = mv.value;

            expect(value.bar).to.equal('baz');
            expect(value.hello).to.be.undefined;

            value.hello = 'world';

            expect(value.hello).to.be.undefined;

            model.get('foo').then(function(mv2) {
                expect(mv2.value.hello).to.be.undefined;

                done();
            });
        });
    });

    it('notifies change watchers', function(done) {
        model.get('foo').then(function(mv) {
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
        model.destroy('foo').then(function() {
            model.get('foo').then(function(mv) {
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

            get: function(value) {
                return new CurvilinearPromise().fulfill(someStoreStorage[value]);
            },

            set: function(key, value) {
                someStoreStorage[key] = value;

                return new CurvilinearPromise().fulfill();
            },

            destroy: function(key) {
                delete someStoreStorage[key];

                return new CurvilinearPromise().fulfill();
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
        }).then(function() {
            var remove = model.observe('witch', function(newValue) {
                try {
                    remove();

                    expect(newValue.seer).to.equal(true);

                    done();
                } catch (e) {
                    done(e);
                }
            });

            model.get('witch').then(function(mv) {
                expect(mv.value.seer).to.equal(true);

                done();
            });
        });
    });
});
