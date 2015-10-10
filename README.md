# curvilinear
Experimental MVC framework for the web.  ~2KB minified\gzipped, 0 dependencies, bring your own templating engine.  IE9+.

## Usage

`<script type="text/javascript" src="curvilinear/dist/curvilinear.min.js"></script>`

This will expose `curvilinear` on the global object.

Alternatively if using require.js, simply `require` the distribution file.  No global will be exposed.

#### curvilinear.Controller

###### `Controller(el)` (constructor)

Instantiate a new Controller.  `el` can be a reference to an element, or a string element selector.  The controller will be rendered as a direct child of the element.

###### `(instance).generateHTML(data)`

Generate the view based on the data (see `datasources`).  This method should return a string of HTML and must be implemented by you.  Generally this is as simple as passing the data and some specific template for the controller to your favorite templating engine.

###### `instance.datasources`

###### `instance.render()`

Render the controller - this will resolve all `datasources` and call `generateHTML`.  Generally you only need to call this method once in order to kick things off - any data changes will automatically cause a re-render.  Re-renders are achieved via DOM diffing.  Calls to `render` will cancel any other pending `render` calls in order to prevent race conditions.

Will return a promise that resolves if and when that particular rendering call has completed.

###### `instance.events`

###### `instance.own(f)`

Will return `this` for chaining.

###### `instance.disown(f)`

Will return `this` for chaining.

###### `instance.destroy()`

Destroy all ownables and remove controller from the DOM.  Also destroys all of the controller's children.  Once a controller is destroyed, it is completely cleaned up and cannot be re-rendered.

Will return `this` for chaining.

###### `instance._createChildren()`

#### curvilinear.model

###### `get(key)`

Get a value by key.

Will return an object like:

```js
{
    key: key,
    value: value
}
```

If your value is an object, it will be returned as a frozen copy.

###### `set(key, value)`

Set a value at a key.

Will return `this` for chaining.

###### `observe(key, f)`

Observe changes to a key.  The callback `f` will be invoked with a frozen copy of the updated value whenever it is changed.

Will return a function that can be invoked to stop observing.

###### `registerStore(name, store)`

Register a store.  A store is just a place to put your data, for example you might implement a localStorageStore or an xhrStore.  Stores must implement `get(key)`, `set(key, value)`, and `destroy(key)`.

Will return `this` for chaining.

###### `registerStoreForKey(key, storeName)`

Register a key to be backed by a specific store.  By default, all keys are backed the default memory store (JS heap).

Will return `this` for chaining.

###### `destroy(key)`

Removes entry from model.

Will return `this` for chaining.

## Tests

To run the test suite, open "test/test.html"
