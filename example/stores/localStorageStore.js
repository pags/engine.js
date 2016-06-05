/**
 * Allows persistence of data to local storage.
 */
(function() {
    curvilinear.model.registerStore('localStorage', {
        get: function(key, cb) {
            var value = window.localStorage[key];

            cb(null, typeof value === 'undefined' ? value : JSON.parse(value));

            return this;
        },

        set: function(key, value, cb) {
            window.localStorage[key] = JSON.stringify(value);

            cb();

            return this;
        },

        destroy: function(key, cb) {
            delete window.localStorage[key];

            cb();

            return this;
        }
    });
}());
