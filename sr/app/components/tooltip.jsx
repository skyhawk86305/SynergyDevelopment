'use strict';

var React = require('react'),
    classSet = React.addons.classSet,
    _ = require('lodash');

var POSITION_FIXES = {
        left: function fixLeft(parent, self) {
            return {
                left: parent.left - self.width,
                top: parent.top + parent.height/2 - self.height/2,
            };
        },
        top: function fixTop(parent, self) {
            return {
                left: parent.left + parent.width/2 - self.width/2,
                top: parent.top - self.height + 16,
            };
        }
    };

var Tooltip = React.createClass({
    propTypes: {
        position: function checkPosition(props, propName /*, componentName */) {
            var position = props[propName];
            if (!POSITION_FIXES[position]) {
                throw new Error('unknown position: ' + position);
            }
        },
        title: React.PropTypes.string,
        titleClassName: React.PropTypes.string,
    },

    componentDidMount: function() {
        this.updatePosition();
        window.addEventListener('resize', this.updatePosition);
        var parent = this.getDOMNode().parentNode;
        parent.addEventListener('mouseenter', this._onMouseEnterParent);
        parent.addEventListener('mouseleave', this._onMouseLeaveParent);
    },

    componentWillUnmount: function() {
        window.removeEventListener('resize', this.updatePosition);
        var parent = this.getDOMNode().parentNode;
        parent.removeEventListener('mouseenter', this._onMouseEnterParent);
        parent.removeEventListener('mouseleave', this._onMouseLeaveParent);
    },

    updatePosition: function () {
        var self = this.getDOMNode(),
            selfPos = self.getBoundingClientRect(),
            parentPos = self.parentNode.getBoundingClientRect(),
            fixer = POSITION_FIXES[this.props.position],
            pos = fixer(parentPos, selfPos);
        this.setState({
            left: pos.left,
            top: pos.top,
        });
    },

    _onMouseEnterParent: function() {
        this.updatePosition();
        this.setState({
            visible: true,
        });
    },

    _onMouseLeaveParent: function() {
        this.setState({
            visible: false,
        });
    },

    getInitialState: function() {
        return {
            left: 0,
            top: 0,
            visible: false,
        };
    },

    render: function() {
        var state = this.state,
            classes = {
                popover: true,
            },
            titleClasses = {
                'popover-title': true,
            },
            mainStyle = {
                display: 'block', // override Bootstrap CSS default of none
                visibility: state.visible ? 'visible': 'hidden',
                position: 'fixed',
                left: state.left,
                top: state.top,
            };

        classes[this.props.position] = true;
        _.each((this.props.titleClassName || '').split(' '), function (_class) {
            titleClasses[_class] = true;
        });

        return (
            <div className={ classSet(classes) } style={ mainStyle }>
                <div className="arrow" />
                {
                    (!this.props.title) ? null: (
                        <div className={ classSet(titleClasses) }>
                            {  lineBreak(this.props.title) }
                        </div>
                    )
                }
                <div className="popover-content">
                    { this.props.children }
                </div>
            </div>
        );
    }
});

function lineBreak(title) {
    var raw = title.split('\\n'),
        cooked = [];

    for (var idx in raw) {
        if (idx > 0) {
            cooked.push(
                <br/>
            );
        }
        cooked.push(raw[idx]);
    }

    return cooked;
}

module.exports = Tooltip;
