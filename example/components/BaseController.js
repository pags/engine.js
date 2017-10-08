/**
 * Create our base controller to work with.
 */
(function() {
    var Controller = window.engine.Controller;

    function BaseController() {
        Controller.apply(this, arguments);
    }

    BaseController.prototype = Object.create(Controller.prototype);

    // Set up templating with nunjucks
    BaseController.prototype.generateHTML = function(data) {
        return nunjucks.renderString(this.view, data);
    };

    // Add Backbone-style inheritance convenience
    BaseController.extend = function(def) {
        var parentType = this;

        function Type() {
            parentType.apply(this, arguments);
        }

        Type.prototype = Object.create(parentType.prototype);

        for (var key in def) {
            Type.prototype[key] = def[key];
        }

        Type.extend = BaseController.extend;

        return Type;
    };

    window.BaseController = BaseController;
}());