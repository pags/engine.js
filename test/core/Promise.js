var CurvilinearPromise = window.curvilinear.Promise;

describe('CurvilinearPromise', function() {
    var expect = window.chai.expect;

    it('calls onFulfilled when fulfilled from pending state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function(value) {
            expect(value).to.equal('foo');

            return 'bar';
        }).then(function(value) {
            expect(value).to.equal('bar');

            done();
        });

        promise.fulfill('foo');
    });

    it('calls onFulfilled when already fulfilled', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function() {
            promise.fulfill('bar');

            promise.then(function(value) {
                expect(value).to.equal('foo');

                done();
            });
        });

        promise.fulfill('foo');
    });

    it('calls onRejected when rejected from pending state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(null, function(reason) {
            expect(reason).to.equal('foo');

            done();
        });

        promise.reject('foo');
    });

    it('calls onRejected when already rejected', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(null, function() {
            promise.reject('bar');

            promise.then(null, function(reason) {
                expect(reason).to.equal('foo');

                done();
            });
        });

        promise.reject('foo');
    });

    it('does nothing when calling fulfill on fulfilled state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function(value) {
            expect(value).to.equal('foo');

            promise.fulfill('foo');

            done();
        }, function() {
            done(new Error());
        });

        promise.fulfill('foo');
    });

    it('does nothing when calling fulfill on rejected state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function(value) {
            done(new Error());
        }, function(reason) {
            expect(reason).to.equal('foo');

            promise.fulfill('bar');

            done();
        });

        promise.reject('foo');
    });

    it('does nothing when calling reject on fulfilled state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function(value) {
            expect(value).to.equal('foo');

            promise.reject('bar');

            done();
        }, function() {
            done(new Error());
        });

        promise.fulfill('foo');
    });

    it('does nothing when calling reject on rejected state', function(done) {
        var promise = new CurvilinearPromise();

        promise.then(function(value) {
            done(new Error());
        }, function(reason) {
            expect(reason).to.equal('foo');

            promise.reject('bar');

            done();
        });

        promise.reject('foo');
    });

    it('serializes an Array of functions that return promises (n=1)', function(done) {
        var count = 0,
            promise = new CurvilinearPromise(),
            promises = [function() {
                return promise.then(function(value) {
                    count += value;

                    return value;
                });
            }];

        CurvilinearPromise.serialize(promises).then(function() {
            expect(count).to.equal(1);

            done();
        }, function() {
            done(new Error());
        });

        promise.fulfill(1);
    });

    it('serializes an Array of functions that return promises (n>1)', function(done) {
        var count = 0,
            promise1 = new CurvilinearPromise(),
            promise2 = new CurvilinearPromise(),
            promises = [function() {
                return promise1.then(function(value) {
                    count += value;
                });
            }, function() {
                try {
                    expect(count).to.equal(1);
                } catch (error) {
                    done(error);
                }

                return promise2.then(function(value) {
                    count += value;
                });
            }];

        CurvilinearPromise.serialize(promises).then(function() {
            expect(count).to.equal(2);

            done();
        }, function() {
            done(new Error());
        });

        promise1.fulfill(1);
        promise2.fulfill(1);
    });

    it('serializes a mixed Array of functions that return promises and promises', function(done) {
        var count = 0,
            promise1 = new CurvilinearPromise(),
            promise2 = new CurvilinearPromise(),
            promises = [promise1.then(function(value) {
                count += value;
            }), function() {
                try {
                    expect(count).to.equal(1);
                } catch (error) {
                    done(error);
                }

                return promise2.then(function(value) {
                    count += value;
                });
            }];

        CurvilinearPromise.serialize(promises).then(function() {
            expect(count).to.equal(2);

            done();
        }, function() {
            done(new Error());
        });

        promise1.fulfill(1);
        promise2.fulfill(1);
    });

    it('serializes an Array of promises (n=1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;

                return value;
            })];

        CurvilinearPromise.serialize(promises).then(function() {
            expect(count).to.equal(1);

            done();
        }, function() {
            done(new Error());
        });

        promises[0].fulfill(1);
    });

    it('serializes an Array of promises (n>1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;
            }), new CurvilinearPromise().then(function(value) {
                count += value;
            })];

        CurvilinearPromise.serialize(promises).then(function() {
            expect(count).to.equal(2);

            done();
        }, function() {
            done(new Error());
        });

        promises.forEach(function(promise) {
            promise.fulfill(1);
        });
    });

    it('serializes an Array of promises where a promise gets rejected (n>1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;
            }), new CurvilinearPromise().then(function(value) {
                count += value;
            })];

        CurvilinearPromise.serialize(promises).then(function() {
            done(new Error());
        }, function(error) {
            expect(error).to.be.instanceof(Error);

            done();
        });

        promises[0].reject(new Error());
        promises[1].fulfill(1);
    });

    it('parallelizes an Array of promises (n=1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;
            })];

        CurvilinearPromise.parallelize(promises).then(function() {
            expect(count).to.equal(1);

            done();
        }, function() {
            done(new Error());
        });

        promises.forEach(function(promise) {
            promise.fulfill(1);
        });
    });

    it('parallelizes an Array of promises (n>1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;
            }), new CurvilinearPromise().then(function(value) {
                count += value;
            })];

        CurvilinearPromise.parallelize(promises).then(function() {
            expect(count).to.equal(2);

            done();
        }, function() {
            done(new Error());
        });

        promises.forEach(function(promise) {
            promise.fulfill(1);
        });
    });

    it('parallelizes an Array of promises where a promise gets rejected (n>1)', function(done) {
        var count = 0,
            promises = [new CurvilinearPromise().then(function(value) {
                count += value;
            }), new CurvilinearPromise().then(function(value) {
                count += value;
            })];

        CurvilinearPromise.parallelize(promises).then(function() {
            done(new Error());
        }, function(error) {
            expect(error).to.be.instanceof(Error);

            done();
        });

        promises[0].reject(new Error());
        promises[1].fulfill(1);
    });
});
