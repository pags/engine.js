(function() {
    var model = curvilinear.model;

    window.TodoInput = BaseController.extend({

        events: {

            'change input': function(event) {
                model.set('curvilinearItems', {
                    text: event.target.value,
                    complete: false
                });

                event.target.value = '';
            }

        },

        view: '<input type="text" placeholder="Enter TODO item">'

    });
}());
