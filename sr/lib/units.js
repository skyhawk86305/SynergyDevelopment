'use strict';

var _ = require('lodash'),
    assert = require('assert'),
    util = require('util');


/*
    Shape:
        {
            value: <decimal>,  // How many of this unit
            type: <string>,  // The short type name (ex. GB)
            name: <string>,  // The long type name (ex. Gigabyte)
            value_gb: <decimal>,  // The value in GB of the unit, this will always be here. It makes it easy to compare/sort etc
            unit: {
                base: <int>,  // The base of the unit (2 or 10)
                pow: <int>  // The power to raise the base to, gets multiplied times value in conversion (ex. 20, 30, etc)
            }
        }

    Usage:
        1) Create a new Unit
        var Unit = require('<path>/units.js');
        var FiveGigabyte = new Unit(5, 'GB');
        -> NOTE: The default unit is GB, you can create it like "new Unit(5)"

        2) Get a friendly-printed unit
        var FiveGigabyte = new Unit(5, 'GB');
        -> FiveGigabyte.friendly() -> "5 GB"

        You can use the following optional args (toPlaces, useName, optFormatString)
        -> FiveGigabyte.friendly(2, true) -> "5.00 Gigabytes"

        optFormatString allows you to push the same type of string that util.format uses with
            the first %d as the value and %s as the unit name
        -> FiveGigabyte.friendly(2, true, "We have %d of %s") -> "We have 5.00 of Gigabytes"

        The plural of the unit type is handled automatically when using full name.

        3) Convert a unit
        var FiveGigabyte = new Unit(5, 'GB');
        var InGibiBytes = FiveGigabyte.to('GiB');

        You can also chain..
        var ConversionChain = FiveGigabyte.to('GiB').to('TiB').to('KB');

    ToDo:
        Case insensitive unit type matching
        Add / Subtract / Divide / Multiply
        Compare
        Tests
*/

function Unit(val, unitType) {
    if (!(this instanceof Unit)) {
        return new Unit(val);
    }

    if (!unitType) {
        unitType = this.DEFAULTS.type;
    }

    if (val !== 0 && !val) {
        val = this.DEFAULTS.modifier;
    }

    assert(val >= 0, 'Unit value cannot be negative');

    var destUnit = this._findUnitType(unitType);

    _.merge(this, this._packageUnit(destUnit.type, destUnit.name, val, destUnit.unit.base, destUnit.unit.pow));
    _.merge(this, { value_gb: this._inGb() });
}

Unit.prototype.to = function(unitType) {
    if (!_.isObject(unitType) && _.isString(unitType)) {
        // Figure out what it is and go from string -> type object
        unitType = this._findUnitType(unitType);
    }

    var conversion = this._convert(unitType);
    return new Unit(conversion.value, unitType);
};

/*
    NOTICE: For arithmetic operations, we want to keep the type the same as the _original_ object
*/

Unit.prototype.add = function(unitToAdd) {
    this._assertIsUnitObject(unitToAdd);

    var newVal = this.value_gb + unitToAdd.value_gb;

    return this._packAndReturnArithmeticResult(newVal);
};

Unit.prototype.subtract = function(unitToSubtract) {
    this._assertIsUnitObject(unitToSubtract);

    var newVal = this.value_gb - unitToSubtract.value_gb;

    return this._packAndReturnArithmeticResult(newVal);
};

Unit.prototype.mult = function(multiplier) {
    var newVal = this.value_gb * multiplier;

    return this._packAndReturnArithmeticResult(newVal);
};

Unit.prototype.divide = function(divider) {
    var newVal = this.value_gb / divider;

    return this._packAndReturnArithmeticResult(newVal);
};

Unit.prototype.makeHappyFriendly = function(toPlaces, useName, optFormatString) {
    var _this = this;

    /*
        What does this do?
            If > 1000, it converts up to the next power until < 1000 and returns friendly string
    */
    var finalUnit = null,
        likeUnits = _.where(this.TYPES, function(type) {
            return type.unit.base === _this.unit.base;
        });

    _.forEach(likeUnits, function(likeUnit) {
        var newUnit = _this.to(likeUnit.type);

        if (newUnit.value < 1000 && !finalUnit) {
            finalUnit = newUnit;
        }
    });

    if (finalUnit) {
        return finalUnit.friendly(toPlaces, useName, optFormatString);
    }
    else {
        return 'Unknown';
    }
};

Unit.prototype.friendly = function(toPlaces, useName, optFormatString) {
    /*
        Available --
    */
    var formatString = optFormatString || this.DEFAULTS.friendly.formatString,
        roundToPlaces = toPlaces || this.DEFAULTS.friendly.toPlaces,
        useFullUnit = useName || this.DEFAULTS.friendly.useName,
        val = this.value,
        unit = this.type;

    // Catch bad truthy assertion
    if (toPlaces === 0) {
        roundToPlaces = toPlaces;
    }

    if (val > 0 && val % 1 !== 0) {
        // Not an integer
        val = val.toFixed(roundToPlaces);
    }

    if (useFullUnit) {
        var pluralModifier = 's';

        if (val === 1) {
            pluralModifier = '';
        }

        unit = util.format('%s%s', this.name, pluralModifier);
    }

    return util.format(formatString, val, unit);
};

Unit.prototype.types = function() {
    return _.map(this.TYPES, function(item) {
        return {
            type: item.type,
            name: item.name,
            base: item.unit.base
        };
    });
};

Unit.prototype._packAndReturnArithmeticResult = function(newVal) {
    // ONLY pass in GB values, this should not be public
    return (new Unit(newVal)).to(this.type);
};

Unit.prototype._assertIsUnitObject = function(unitObject) {
    assert((unitObject instanceof Unit), 'You must provide a Unit object to arithmetic operators.');
};

Unit.prototype._findUnitType = function(unitType) {
    if (_.isObject(unitType)) {
        return unitType;
    }

    var unitTypeObject = _.first(_.where(this.TYPES, function(unit) {
        return unit.type === unitType;
    }));

    assert(unitTypeObject, util.format('No matching unit of type %s', unitType));

    return unitTypeObject;
};

Unit.prototype._convert = function(toType) {
    var ratio = Math.pow(this.unit.base, this.unit.pow) / Math.pow(toType.unit.base, toType.unit.pow);

    return {
        value: this.value * ratio,
        from: this
    };
};

Unit.prototype._inGb = function() {
    var gbType = this._findUnitType('GB');

    return this._convert(gbType).value;
};

Unit.prototype._packageUnit = function(type, name, modifier, base, pow) {
    return {
        value: modifier,
        type: type,
        name: name,
        unit: {
            base: base,
            pow: pow
        }
    };
};

Unit.prototype.DEFAULTS = {
    type: 'GB',
    modifier: 0,
    friendly: {
        toPlaces: 2,
        useName: false,
        formatString: '%d %s'
    }
};

Unit.prototype.TYPES = [
    {
        type: 'B',
        name: 'Byte',
        unit: {
            base: 2,
            pow: 1
        }
    },
    {
        type: 'KB',
        name: 'Kilobyte',
        unit: {
            base: 10,
            pow: 3
        }
    },
    {
        type: 'KiB',
        name: 'Kibibyte',
        unit: {
            base: 2,
            pow: 10
        }
    },
    {
        type: 'MB',
        name: 'Megabyte',
        unit: {
            base: 10,
            pow: 6
        }
    },
    {
        type: 'MiB',
        name: 'Mibibyte',
        unit: {
            base: 2,
            pow: 20
        }
    },
    {
        type: 'GB',
        name: 'Gigabyte',
        unit: {
            base: 10,
            pow: 9
        }
    },
    {
        type: 'GiB',
        name: 'Gibibyte',
        unit: {
            base: 2,
            pow: 30
        }
    },
    {
        type: 'TB',
        name: 'Terabyte',
        unit: {
            base: 10,
            pow: 12
        }
    },
    {
        type: 'TiB',
        name: 'Tibibyte',
        unit: {
            base: 2,
            pow: 40
        }
    },
    {
        type: 'PB',
        name: 'Petabyte',
        unit: {
            base: 10,
            pow: 15
        }
    },
    {
        type: 'PiB',
        name: 'Pebibyte',
        unit: {
            base: 2,
            pow: 50
        }
    }
];

module.exports = Unit;
