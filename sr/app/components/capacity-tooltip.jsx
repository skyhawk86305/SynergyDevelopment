'use strict';

var React = require('react'),
    Tooltip = require('./tooltip'),
    Unit = require('../../lib/units.js');

var CapacityTooltip  = React.createClass({
    propTypes: {
        inputValue: React.PropTypes.number,
        displayUnitsFrom: React.PropTypes.string,
        inputUnit: React.PropTypes.object,
    },

    render: function() {
        ////assert(this.props.inputUnit || this.props.inputValue >= 0 && this.props.displayUnitsFrom);
        var unit = this.props.inputUnit || new Unit(this.props.inputValue, this.props.displayUnitsFrom);

        return (
            <Tooltip title={ this.props.title || "Capacity" }
                     position="left"
                     titleClassName="right strong">
                <table>
                    <tr><th className="right">Base 2</th>
                        <th/>
                        <th className="right">Base 10</th></tr>
                    <tr><td className="numeric"> {formatUnit(unit.to('GiB'))} GiB</td>
                        <td/>
                        <td className="numeric"> {formatUnit(unit.to('GB' ))} GB</td></tr>
                    <tr><td className="numeric"> {formatUnit(unit.to('TiB'))} TiB</td>
                        <td/>
                        <td className="numeric"> {formatUnit(unit.to('TB' ))} TB</td></tr>
                </table>
            </Tooltip>
        );

        function formatUnit(u) {
            return u.value.toFixed(3).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
        }
    },
});

module.exports = CapacityTooltip;
