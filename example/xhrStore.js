define([
    'lib/jquery'
], function(
    $
) {
    var URL = 'http://jsonplaceholder.typicode.com/posts/';

    return {

        get: function(key) {
            return $.ajax({
                url: URL + key,
                dataType: 'json'
            });
        },

        set: function(key, value) {
            return $.ajax({
                url: URL + key,
                method: 'POST',
                dataType: 'json'
            });
        },

        destroy: function(key) {
            return $.ajax({
                url: URL + key,
                method: 'DELETE',
                dataType: 'json'
            });
        }

    };
});
