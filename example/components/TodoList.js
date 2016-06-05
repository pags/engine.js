(function() {
    var model = curvilinear.model;

    window.TodoList = BaseController.extend({

        events: {

            'change input[type="checkbox"]': function(event) {
                model.set('curvilinearItems', {
                    id: event.target.getAttribute('data-id'),
                    complete: event.target.checked
                });
            }

        },

        datasources: [{

                items: function() {
                    return Q.ninvoke(model, 'get', 'curvilinearItems');
                }

            },

            {
                itemsSorted: function(data) {
                    return data.items && data.items.sort(function(a, b) {
                        if (a.complete !== b.complete) {
                            return a.complete ? 1 : -1;
                        }

                        return a.id - b.id;
                    });
                }
            }
        ],

        view: '<ul>{% for item in itemsSorted %}<li><label><input type="checkbox" {% if item.complete %}checked{% endif %} data-id="{{item.id}}">{{item.text}}</label></li>{% endfor %}</ul>'

    });
}());
