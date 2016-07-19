# curvilinear
Experimental MVC framework for the web.  ~2.5KB minified\gzipped, 0 dependencies, bring your own templates.  IE9+.

* Composable controllers - nest your controllers and let curvilinear determine what and when to re-render.
* Centralized model - all data flows from a single source of truth, controllers don't own state.
* No dispatchers - each controller declares its own data dependencies and whether they should be resolved in combinations of parallel or series.
* DOM diffing - no need to wire up tedious DOM manipulation code.
* AMD compatible.

## Example

See "example/example.html".

## Usage

`<script type="text/javascript" src="curvilinear/dist/curvilinear.min.js"></script>`

This will expose `curvilinear` on the global object.

Alternatively if using require.js, simply `require` the distribution file.  No global will be exposed.

### curvilinear.Controller

#### `new Controller(el)` (constructor)

Instantiate a new Controller.  `el` can be a reference to an element, or a string element selector.  The controller will be rendered as a direct child of the element.

#### `(instance).generateHTML(data)`

Generate the view based on the data (see `datasources`).  This method should return a string of HTML and must be implemented by you.  Generally this is as simple as passing the data and some specific template for the controller to your favorite templating engine.

#### `(instance).datasources`

An object or array of objects of the following format:

```
{
    key : function(data) { return 'value'; },
    // ...
}
```

Datasource object keys and values get mapped directly to a `data` object that is passed to `generateHTML`.

ex:
```
{
    foo : function(data) { return 'bar'; },
    fizz : function(data) { return 'buzz'; }
}

data -> { foo : 'bar', fizz : 'buzz' }
```

`data` will be frozen and cannot be mutated from anywhere other than `datasources`.

Object value functions can return an immediate value or a promise.  If a value function returns the result of a call to `model.get`, the controller will automatically re-render itself if the value retrieved from `model` is updated.

Additionally, `datasource` keys within an object will be resolved in parallel, while objects within an array will be resolved in serial.

ex:
```
[{
    foo : function(data) { return 'bar'; },
    fizz : function(data) { return 'buzz'; }
},
{
    hello : function(data) { return 'world'; }
}]
```

`foo` and `fizz` will be resolved together, and `hello` will be resolved only once `foo` and `fizz` are.  In this way, asynchronous operations such as xhr calls can be grouped in parallel if they are not interdependent, or arranged in serial if they are.  `data` will contain intermediately resolved values along the way.

#### `(instance).start(callback)`

Render the controller - this will resolve all `datasources` and call `generateHTML`.  Generally you only need to call this method once in order to kick things off - any model changes will automatically cause a re-render.  Re-renders are achieved via DOM diffing, so UI state such as input focus or scroll position is preserved.  Calls to `start` will cancel any other pending `start` calls for the controller in order to prevent race conditions.

Callback will be called when that particular rendering call has completed.

Will return `this` for chaining.

#### `(instance).children`

An optional object where the key is an element selector, and the value is a function that will be invoked with an element reference matching the selector in the key.  This function should return an *un-started* child that is instantiated with the supplied element reference.

ex:
```
{
    '.child': function(el) {
        return new Child(el);
    },
    ...
}
```

This is allows for arbitrary composition of controllers.

#### `(instance).events`

An optional object where the key is a string starting with a native DOM event type, followed by a space, followed by any number of element selectors, and the value is an event handler that will be invoked with the event and bound to the controller instance.

ex:
```
{
    'change input': function(event) { ... },
    ...
}
```

Exactly the same as `Backbone.View.events`.  Will only detect events from the controller's direct view, and *not* from child views.

#### `(instance).own(f)`

Add a cleanup function to be called when the controller is destroyed.

Will return `this` for chaining.

#### `(instance).disown(f)`

Remove a previously added cleanup function.

Will return `this` for chaining.

#### `(instance).destroy()`

Destroy all ownables and remove the controller.  Will automatically remove all event listeners added via `events`.  Also destroys all of the controller's children.  Once a controller is destroyed, it should be completely cleaned up and cannot be re-rendered.

Will return `this` for chaining.

### curvilinear.model

#### `get(key, callback)`

Get a value by key.

Callback will be called with an object like:

```
{
    key: key,
    value: value
}
```

If your value is an object, it will be returned as a frozen copy.

Will return `this` for chaining.

#### `set(key, value, callback)`

Set a value at a key.

Callback will be called when the value is set (generally applicable to stores that perform asynchronous operations).

Will return `this` for chaining.

#### `destroy(key, callback)`

Remove a key\value pair from the model.

Callback will be called when the value is removed (generally applicable to stores that perform asynchronous operations).

Will return `this` for chaining.

#### `observe(key, f)`

Observe changes to a key.  The callback `f` will be invoked with a frozen copy of the updated value whenever it is changed.

Will return a function that can be invoked to stop observing.

#### `registerStore(name, store)`

Register a store.  A store is just a place to put your data, for example you might implement an xhrStore or a localStorageStore (see `examples`).  Stores must implement `get(key)`, `set(key, value)`, and `destroy(key)`.

Will return `this` for chaining.

#### `registerStoreForKey({ key, store })`

Register a key to be backed by a specific store.  By default, all keys are backed by the memory store (JS heap).

Will return `this` for chaining.

## Tests

To run the test suite, open "test/test.html"
