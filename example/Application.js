(function() {
    curvilinear.model.registerStoreForKey('items', 'collection');

    var Application = BaseController.extend({

        template: '<div id="summary"></div><div id="input"></div><div id="list"></div>',

        _createChildren: function() {
            return [
                new TodoInput('#input'),
                new TodoList('#list'),
                new TodoSummary('#summary')
            ]
        }

    });

    new Application('#application').render();
}());
