# curvilinear
Experimental MVC framework for the web.  ~2KB minified\gzipped, 0 dependencies, bring your own templating engine.  IE9+.

## Philosophy

Controllers are primarily functions (templating engines) over static or dynamic (model) data sources that output a view (HTML).

Controllers can listen for DOM events generated within their view, and change any model, including ones they don't consume.  There is no god dispatcher or user-generated dispatch code.

Controllers are composable.

Controllers' data sources are composable - they can be grouped arbitrarily in serial or parallel to maximize efficiency.

If a model changes, automatically re-render the views of relevant controllers using DOM diffing.

Models can also be programmatically changed.

Models can be backed by any form of persistence (store).

That's it.

## Usage

`<script type="text/javascript" src="curvilinear/dist/curvilinear.min.js"></script>`

This will expose `curvilinear` on the global object.

Alternatively if using require.js, simply `require` the distribution file.  No global will be exposed.

##### curvilinear.Controller

##### curvilinear.model

###### `get(key)`

Get a value by key.  Will return an object like:

```js
{
    key: key,
    value: value
}
```

If your value is an object, it will be returned as a frozen copy.

###### `set(key, value)`

Set a value at a key.

###### `observe(key, f)`

Observe changes to a key.  The callback `f` will be invoked with a frozen copy of the updated value whenever it is changed.  Will return a function that can be invoked to stop observing.

###### `registerStore(name, store)`

Register a store.  A store is just a place to put your data, for example you might implement a localStorageStore or an xhrStore.  Stores must implement `get(key)`, `set(key, value)`, and `destroy(key)`.

###### `registerStoreForKey(key, storeName)`

Register a key to be backed by a specific store.  By default, all keys are backed the default memory store (JS heap).

###### `destroy(key)`

Removes entry from model.

## Tests

To run the test suite, open "test/test.html"
