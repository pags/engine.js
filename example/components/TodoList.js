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

        datasources: {

            items: function() {
                return model.get('items');
            }

        },

        template: '<ul>{% for item in items %}<li><input type="checkbox" {% if item.complete %}checked{% endif %} data-id="{{item.id}}">{{item.text}}</li>{% endfor %}</ul>'

    });
}());
