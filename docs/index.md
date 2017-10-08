## What's different about engine.js?

+ You don't need to run a complicated build system just to get your app to run in a web browser.

In fact, you don't need to a build process at all. engine.js is written in JavaScript that is supported natively by browsers all the way back to IE9. It's also compatible with AMD and require.js right out of the box. And if you want to, you can still use popular transpilers like Browserify, Webpack, and Babel.

+ It's tiny.

engine.js is _2.5kb_ gzipped.

React is _34.8kb_ gzipped.

Vue is _20.9kb_ gzipped.

+ Your markup is your markup.

engine.js works with _any_ HTML templating system. Have existing templates? Great, use them with engine.js.

+ Data pipeline

Wrangling asycnhronous data can be the hardest part of writing a complex app.  Most frameworks simply provide a specific component lifecycle function (like `componentDidMount`) as a big blank canvas for you to get yourself into trouble.

engine.js introduces the concept of a _data pipeline_. With a clear declarative syntax, you can define which pieces of data your component needs in blocks of series of parallel. When a block within your pipeline changes, engine.js will automatically reprocess the pipeline from that point onward, giving each downstream block a chance to react to changes.

## Great. What does the code look like?

## Where's the TODO MVC example?

There isn't one.  You're going to need to create something more complicated than that, aren't you?
