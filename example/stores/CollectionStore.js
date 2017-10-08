/**
 * Allows persistence of collections.
 */
(function() {
    var model = engine.model;

    model.registerStore('collection', {
        get: function(key, cb) {
            return model.stores.localStorage.get(key, cb);
        },

        set: function(key, value, cb) {
            return this.get(key, function(error, values) {
                if (values) {
                    if (typeof value.id === 'undefined') {
                        var highest = 0;

                        values.forEach(function(v) {
                            if (v.id > highest) {
                                highest = v.id;
                            }
                        });

                        value.id = ++highest;

                        values.push(value);
                    } else {
                        for (var i = 0, l = values.length; i < l; i++) {
                            if (values[i].id == value.id) {
                                for (var k in value) {
                                    values[i][k] = value[k];
                                }

                                break;
                            }
                        }
                    }

                    model.stores.localStorage.set(key, values, cb);
                } else {
                    value.id = 0;

                    model.stores.localStorage.set(key, [value], cb);
                }
            });
        },

        destroy: function(key, cb) {
            return model.stores.localStorage.destroy(key, cb);
        }
    });
}());