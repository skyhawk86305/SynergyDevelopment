# SR Developer Documentation

We're using [React] for rendering, with the [Flux] pattern. In short:

* There'll be as close to zero business logic in the visual components
* Controls will fire change events, e.g. `ADD_SHELF_TO_SYSTEM`
* Those events must carry all the information required to make the change
* The dispatcher will convey the event to the stores
* The stores will update their internal models then fire change events
* React will re-render the components

Based on that and the guard-railing, we'll also pre-validate actions:

* The store will annotate parts of the model with metadata indicating
  which actions will succeed
* Buttons etc will be able to check those to choose whether to render
  as enabled or disabled
* The annotations might be literal (exact event arguments) or functional
  (filter method)

[React]: http://facebook.github.io/react/
[Flux]: http://facebook.github.io/react/docs/flux-overview.html
[Flux TodoMVC]: http://facebook.github.io/react/docs/flux-todo-list.html
[EventEmitter]: http://nodejs.org/api/events.html#events_class_events_eventemitter

Some details:

* [Flux TodoMVC] suggests stores are [EventEmitter]s
* ... but that's as much up to us as the `addChangeListener` etc methods
* ... which is nice because EventEmitter is a Node concept
