'use strict';

var React = require('react'),
    Glyph = require('./glyph');

var ActionTabStrip = React.createClass({
    propTypes: {
        store: React.PropTypes.object.isRequired,
        fire: React.PropTypes.func.isRequired
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

    _onChange: function() {
        this.setState(this.props.store.getState());
    },

    _addButtonClick: function() {
        this.props.fire('PORTFOLIO_ADD_NEW');
        return false;
    },

    _refreshButtonClick: function() {
        this.props.fire('PORTFOLIO_FETCH');
        return false;
    },

    render: function() {
        return (
            <div id="left-panel">
                <ul className="left-tabstrip">
                    <li>
                        <a href="#" onClick={ this._refreshButtonClick }>
                            <Glyph
                                name="refresh"
                                title={'refresh'}
                                spin={ this.state.fetching } />
                        </a>
                    </li>
                    <li className="primary">
                        <a href="#" onClick={ this._addButtonClick }>
                            <Glyph
                                name="plus"
                                title={'add new project'} />
                        </a>
                    </li>
                </ul>
            </div>
        );
    }
});

module.exports = ActionTabStrip;
