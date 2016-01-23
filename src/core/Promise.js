define(function() {
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

    return CurvilinearPromise;
});
