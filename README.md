# curvilinear
Experimental MVC framework for the web.  ~2KB minified\gzipped, 0 dependencies, bring your own templating engine.  IE9+.

## Philosophy

Controllers are primarily functions (templating engines) over static or dynamic (model) data sources that output a view (HTML).

Controllers can listen for DOM events generated within their view, and change any model, including ones they don't consume.  There is no god dispatcher or user-generated dispatch code.

Controllers are composable.

If a model changes, automatically re-render the views of relevant controllers using DOM diffing.

Models can also be programmatically changed.

Models can be backed by any form of persistence (store).

That's it.

## Usage

`<script type="text/javascript" src="curvilinear/dist/curvilinear.min.js"></script>`

This will expose `curvilinear` on the global object.

Alternatively if using require.js, simply `require` the distribution file.  No global will be exposed.

## Tests

To run the test suite, open "test/test.html"
