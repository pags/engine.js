(function() {
    var model = curvilinear.model;

    window.TodoList = BaseController.extend({

        events: {

            'change input[type="checkbox"]': function(event) {
                model.set('items', {
                    id: event.target.getAttribute('data-id'),
                    complete: event.target.checked
                });
            }

        },

        datasources: [{

                items: function() {
                    return model.get('items');
                }

            },

            {
                itemsSorted: function(data) {
                    return data.items && data.items.sort(function(a, b) {
                        if (a.complete && !b.complete) {
                            return 1;
                        }

                        return a.id - b.id;
                    });
                }
            }
        ],

        template: '<ul>{% for item in itemsSorted %}<li><input type="checkbox" {% if item.complete %}checked{% endif %} data-id="{{item.id}}">{{item.text}}</li>{% endfor %}</ul>'

    });
}());
