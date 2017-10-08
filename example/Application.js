/**
 * Main application.
 */
(function() {
    // Just defining that "items" should be stored using the CollectionStore,
    // which allows the management of collections of data under a single key,
    // and saves to local storage.  Without this call, keys will use the default store (see README).
    engine.model.registerStoreForKey({
        key: 'engineItems',
        store: 'collection'
    });

    var Application = BaseController.extend({

        // If using require.js, the `text` plugin would allow templates to be managed within
        // their own files, rather than be defined inline as a literal string.
        view: '<div id="summary"></div><div id="input"></div><div id="list"></div>',

        children: {

            '#input': function(el) {
                return new TodoInput(el);
            },

            '#list': function(el) {
                return new TodoList(el);
            },

            '#summary': function(el) {
                return new TodoSummary(el);
            }

        }

    });

    new Application('#application').start();
}());