'use strict';

var React = require('react'),
    FAGlyph = require('../faglyph'),
    Button = require('../button'),
    Spinner = require('./spinner');

var OptionRow = React.createClass({
    propTypes: {
        type: React.PropTypes.string.isRequired,
        action: React.PropTypes.func,
        optionName: React.PropTypes.string.isRequired,
        optionValue: React.PropTypes.any,
        readOnly: React.PropTypes.bool,
        minValue: React.PropTypes.any,
        maxValue: React.PropTypes.any,
        hide: React.PropTypes.bool,
    },

    render: function() {
        var optionTypeDisplay;

        if (!!this.props.hide) {
            return null;
        }

        switch (this.props.type) {
            case 'extended':
                optionTypeDisplay = (
                    <ExtendedOption
                        optionName={ this.props.optionName }
                        readOnly={ this.props.readOnly }
                        action={ this.props.action } />
                );
            break;
            case 'radio':
                optionTypeDisplay = (
                    <RadioOption
                        optionName={ this.props.optionName }
                        optionValue={ this.props.optionValue }
                        readOnly={ this.props.readOnly }
                        action={ this.props.action } />
                );
            break;
            case 'spinner':
                optionTypeDisplay = (
                    <SpinnerOption
                        optionName={ this.props.optionName }
                        optionValue={ this.props.optionValue }
                        readOnly={ this.props.readOnly }
                        action={ this.props.action }
                        maxValue={ this.props.maxValue }
                        minValue={ this.props.minValue } />
                );
            break;
            case 'text':
                optionTypeDisplay = (
                    <TextOption
                        optionName={ this.props.optionName }
                        readOnly={ this.props.readOnly }
                        action={ this.props.action } />
                );
            break;
            default:
                return null;
        }

        return optionTypeDisplay;
    }
});

var ExtendedOption = React.createClass({
    propTypes: {
        action: React.PropTypes.func,
        optionName: React.PropTypes.string.isRequired,
        readOnly: React.PropTypes.bool,
    },

    render: function() {
        var className = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-option': true,
                'selectable': !!this.props.action && !this.props.readOnly
            });

        return (
            <div className={ className } onClick={ !this.props.readOnly ? this.props.action : null }>
                <div className="row-list-cell">
                    { this.props.optionName }
                </div>
                <span className="chevron">
                    <FAGlyph name={ !this.props.readOnly ? 'chevron-right' : null } hideIfUnnamed={ true } />
                </span>
            </div>
        );
    }
});

var RadioOption = React.createClass({
    propTypes: {
        action: React.PropTypes.func,
        optionName: React.PropTypes.string.isRequired,
        optionValue: React.PropTypes.any,
        readOnly: React.PropTypes.bool,
    },

    render: function() {
        var className = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-option': true,
                'selectable': !!this.props.action && !this.props.readOnly
            });

        return (
            <div className={ className } onClick={ !this.props.readOnly ? this.props.action : null }>
                <div className="row-list-cell">
                    { this.props.optionName }
                </div>
                <span className="chevron">
                    <FAGlyph name={ !!this.props.optionValue ? 'check' : null } hideIfUnnamed={ true } title="Selected" />
                </span>
            </div>
        );
    }
});

var SpinnerOption = React.createClass({
    propTypes: {
        action: React.PropTypes.func.isRequired,
        optionName: React.PropTypes.string.isRequired,
        optionValue: React.PropTypes.any,
        readOnly: React.PropTypes.bool,
        minValue: React.PropTypes.number,
        maxValue: React.PropTypes.number,
    },

    render: function() {
        var className = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-option': true,
                'selectable': false
            });

        return (
            <div className={ className }>
                <div className="row-list-cell">
                    { this.props.optionName }
                </div>
                <Spinner
                    readOnly={ this.props.readOnly }
                    applyValue={ this.props.action }
                    value={ this.props.optionValue }
                    minValue={ this.props.minValue }
                    maxValue={ this.props.maxValue } />
            </div>
        );
    }
});

var TextOption = React.createClass({
    propTypes: {
        action: React.PropTypes.func,
        optionName: React.PropTypes.string.isRequired,
        readOnly: React.PropTypes.bool,
    },

    getInitialState: function() {
        return {
            editMode: false
        };
    },

    render: function() {
        var className = React.addons.classSet({
                'row-list-item': true,
                'row-list-item-option': true,
                'selectable': !!this.props.action && !this.props.readOnly
            });

        if (this.state.editMode) {
            return (
                <div className={ className }>
                    <div className="row-list-cell">
                        <input
                            onChange={ this.props.action }
                            onKeyUp={ this.handleKeyUp }
                            type="text"
                            ref="textInput"
                            value={ this.props.optionName }
                            placeholder="name"
                            className="form-control ae-option-input" />
                    </div>
                    <div className="toolstrip">
                        <Button
                            faglyph="check"
                            onClick={ this.closeEditMode }
                            extraClasses={{
                                'btn-success': true,
                                'no-border': true,
                            }} />
                    </div>
                </div>
            );
        }

        return (
            <div className={ className } onClick={ !this.props.readOnly ? this.openEditMode : null }>
                <div className="row-list-cell">
                    { this.props.optionName }
                </div>
                <span className="chevron">
                    <FAGlyph name={ !this.props.readOnly ? 'pencil' : null } hideIfUnnamed={ true } title="Edit" />
                </span>
            </div>
        );
    },

    closeEditMode: function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        this.setState({
            editMode: false
        });
    },

    handleKeyUp: function(event) {
        if (event.key === 'Enter' || event.key === 'Escape') {
            this.closeEditMode(event);
        }
    },

    openEditMode: function(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }

        this.setState({
            editMode: true
        }, function() {
            this.refs.textInput.getDOMNode().select();
        });
    }
});

module.exports = OptionRow;
