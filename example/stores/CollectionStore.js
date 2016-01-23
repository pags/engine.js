/**
 * Allows persistence of collections.
 */
(function() {
    var model = curvilinear.model;

    model.registerStore('collection', {
        get: function(key) {
            return model.stores.localStorage.get(key);
        },

        set: function(key, value) {
            return this.get(key).then(function(values) {
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

                    return model.stores.localStorage.set(key, values);
                } else {
                    value.id = 0;

                    return model.stores.localStorage.set(key, [value]);
                }
            });
        },

        destroy: function(key) {
            return model.stores.localStorage.destroy(key);
        }
    });
}());
