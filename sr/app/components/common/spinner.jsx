'use strict';

var React = require('react'),
    Button = require('../button');

var Spinner = React.createClass({
    propTypes: {
        applyValue: React.PropTypes.func.isRequired,
        value: React.PropTypes.any,
        readOnly: React.PropTypes.bool,
        minValue: React.PropTypes.number,
        maxValue: React.PropTypes.number,
    },

    render: function() {
        if (this.props.readOnly) {
            return(
                <div className="toolstrip">
                    <div className="row-list-cell">
                        <span className="read-only-value">
                            { this.props.value }
                        </span>
                    </div>
                </div>
            );
        }

        var max = (this.props.maxValue !== undefined) ? this.props.maxValue : Infinity,
            min = (this.props.minValue !== undefined) ? this.props.minValue : 0;

        return (
            <div className="toolstrip">
                <Button
                    faglyph="minus"
                    onClick={ this.decrementValue }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                        'no-pad-right': true,
                        'disabled': this.props.value <= min,
                    }} />
                <input
                    onChange={ this.setValue }
                    type="text"
                    value={ this.props.value }
                    className="input-count"/>
                <Button
                    faglyph="plus"
                    onClick={ this.incrementValue }
                    extraClasses={{
                        'btn-default': true,
                        'no-border': true,
                        'no-pad-left': true,
                        'disabled': this.props.value >= max,
                    }} />
            </div>
        );
    },

    applyValue: function(newValue) {
        var rangeCheckedNewValue = newValue > this.props.maxValue ? this.props.maxValue : newValue < this.props.minValue ? this.props.minValue : newValue;

        this.props.applyValue(rangeCheckedNewValue);
    },

    decrementValue: function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        var increment = this.props.increment || 1;
        this.applyValue(this.props.value - increment);
    },

    incrementValue: function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        var increment = this.props.increment || 1;
        this.applyValue(this.props.value + increment);
    },

    setValue: function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        this.applyValue(event.target.value);
    }
});

module.exports = Spinner;
