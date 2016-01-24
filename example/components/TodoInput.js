(function() {
    var model = curvilinear.model;

    window.TodoInput = BaseController.extend({

        events: {

            'change input': function(event) {
                model.set('items', {
                    text: event.target.value
                });

                event.target.value = '';
            }

        },

        view: '<input type="text" placeholder="Enter TODO item">'

    });
}());
