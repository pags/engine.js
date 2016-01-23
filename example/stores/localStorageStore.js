/**
 * Allows persistence of data to local storage.
 */
(function() {
    var CurvilinearPromise = curvilinear.Promise;

    curvilinear.model.registerStore('localStorage', {
        get: function(key) {
            var value = window.localStorage[key];

            return new CurvilinearPromise().fulfill(typeof value === 'undefined' ? value : JSON.parse(value));
        },

        set: function(key, value) {
            window.localStorage[key] = JSON.stringify(value);

            return new CurvilinearPromise().fulfill();
        },

        destroy: function(key) {
            delete window.localStorage[key];

            return new CurvilinearPromise().fulfill();
        }
    });
}());
