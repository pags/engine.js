define(function() {
    return {

        get: function(key) {
            return window.localStorage[key];
        },

        set: function(key, value) {
            window.localStorage[key] = value;
        },

        destroy: function(key) {
            delete window.localStorage[key];
        }

    };
});
