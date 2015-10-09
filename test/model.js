describe('model', function() {
    var expect = window.chai.expect,
        model = window.curvilinear.model;

    it('returns a dummy object with a change function when no data is set', function(done) {
        var value = model.get('foo');

        expect(typeof value).to.equal('object');

        done();
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
        var value = model.get('foo').value;

        expect(value.bar).to.equal('baz');
        expect(value.hello).to.be.undefined;

        value.hello = 'world';

        expect(value.hello).to.be.undefined;

        expect(model.get('foo').hello).to.be.undefined;

        done();
    });

    it('notifies change watchers', function(done) {
        var value = model.get('foo').value;

        var remove = model.observe('foo', function(newValue) {
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

    it('allows destruction of values', function(done) {
        model.destroy('foo');

        expect(model.get('foo').value).to.be.undefined;

        done();
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
                return someStoreStorage[value];
            },

            set: function(key, value) {
                someStoreStorage[key] = value;
            },

            destroy: function(key) {
                delete someStoreStorage[key];
            }

        });

        done();
    });

    it('disallows the registration of keys to unknown stores', function(done) {
        expect(function() {
            model.registerStoreForKey('witch', 'whatever');
        }).to.throw;

        done();
    });

    it('allows the registration of keys to known stores', function(done) {
        model.registerStoreForKey('witch', 'someStore');

        model.set('witch', {
            seer: true
        });

        var remove = model.observe('witch', function(newValue) {
            try {
                remove();

                expect(newValue.seer).to.equal(true);

                done();
            } catch (e) {
                done(e);
            }
        });

        expect(model.get('witch').value.seer).to.equal(true);

        done();
    });
});
