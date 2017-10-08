(function() {
    var model = engine.model;

    window.TodoSummary = BaseController.extend({

        datasources: [{

            items: function() {
                return Q.ninvoke(model, 'get', 'engineItems');
            }

        }, {

            completedCount: function(data) {
                var complete = 0;

                if (data.items) {
                    data.items.forEach(function(item) {
                        if (item.complete) {
                            complete++;
                        }
                    });
                }

                return complete;
            }

        }],

        view: '<div>{{items|length}} TODOs ({{completedCount}} completed)</div>'

    });
}());