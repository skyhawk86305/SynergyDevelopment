'use strict';

var React = require('react'),
    EventButton = require('./event-button'),
    Button = require('./button');

var EventList = React.createClass({
    propTypes: {
        store: React.PropTypes.object.isRequired,
        act: React.PropTypes.func.isRequired,
    },

    getInitialState: function() {
        return this.props.store.getState();
    },

    componentDidMount: function() {
        this.props.store.watch(this._onChange);
    },

    componentWillUnmount: function() {
        this.props.store.unwatch(this._onChange);
    },

    _onOpenCloseButton: function() {
        this.setState({
            open: !this.state.open,
        });
    },

    render: function() {
        var act = this.props.act,
            events = this.state.events,
            open = this.state.open,
            _this = this;

        function eventList() {
            var items = [];

            events.forEach(function renderEvent(event, idx) {
                items.push(
                    <li className="eventlistentry" key={idx}>
                        <Event args={event} />
                    </li>
                );
            });

            return (
                <div className="panel-body">
                    <p>
                        As a debugging tool, we track change events.
                        This list will not be displayed to normal users.
                    </p>
                    <ul className="events">
                        { items }
                    </ul>
                </div>
            );
        }

        var clearButtonClasses = {
            'btn-xs': true,
            'disabled': events.length === 0
        };

        return (
            <div className="panel panel-info">
                <div className="panel-heading">
                    <span className="panel-title">Developers: Events</span>
                    <div className="btn-group pull-right">
                        <Button onClick={ _this._onOpenCloseButton }
                                glyph={ open ? 'eye-close' : 'eye-open' }
                                extraClasses="btn-xs">
                            { events.length }
                            &nbsp;
                            { events.length === 1 ? 'event' : 'events' }
                        </Button>
                        <EventButton act={act}
                                action="EVENTJOURNAL_CLEAR"
                                glyph='trash'
                                extraClasses = { clearButtonClasses }>
                            Clear
                        </EventButton>
                    </div>
                    <div className="clearfix"></div>
                </div>
                { this.state.open ? eventList() : null }
            </div>
        );
    },

    _onChange: function() {
        this.setState(this.props.store.getState());
    }
});

module.exports = EventList;
