'use strict';

var React = require('react'),
    assert = require('assert');

function renderSeparatedList(seq, renderOne, renderSeparator) {
    assert(seq instanceof Array);
    assert(typeof renderOne === 'function');
    assert(typeof renderSeparator === 'function' || renderSeparator === undefined);

    var result = [],
        last = seq.length - 1;

    for (var idx = 0; idx < last; idx ++) {
        result.push(renderOne(seq[idx]));
        if (renderSeparator) {
            result.push(renderSeparator());
        }
    }

    if (seq.length > 0) {
        result.push(renderOne(seq[last]));
    }

    return result;
}

var SeparatedList = React.createClass({
    propTypes: {
        seq: React.PropTypes.array,
        render: React.PropTypes.func.isRequired,
        /* how to check sep, head, tail? */
        className: React.PropTypes.string.isRequired,
    },

    _renderSeparator: function() {
        var sep = this.props.sep;

        if (sep === undefined) {
            return (
                <span className="sep">; </span>
            );
        } else if (typeof sep === 'function') {
            return sep();
        } else {
            return sep;
        }
    },

    render: function() {
        if (this.props.seq && this.props.seq.length > 0) {
            return (
                <div className={ this.props.className }>
                    { this.props.head }
                    {
                        renderSeparatedList(
                            this.props.seq,
                            this.props.render,
                            this._renderSeparator
                        )
                    }
                    { this.props.tail }
                </div>
            );
        } else {
            return (
                <div className={ this.props.className + ' hide' }>
                    { null /* sequence empty or not present */ }
                </div>
            );
        }
    }
});

module.exports = SeparatedList;