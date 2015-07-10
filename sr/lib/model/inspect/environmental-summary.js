'use strict';

var _ = require('lodash'),
    assert = require('assert');

function EnvironmentalSummary(map, hagroups) {
    assert(hagroups instanceof Array, '87f630a3');
    assert(_.has(map, 'inspect'), 'e6f2781d');
    this._selectedHaGroups = hagroups;
    this.inspect = map.inspect;
}

EnvironmentalSummary.prototype._initSummary = function() {
    this.summary = {
        completeStatsAvailable: true,
        power_spec:{
            v_100: {
                typical: {
                    amps: 0.0,
                    watts: 0.0,
                    BTU: 0.0
                },
                worst: {
                    amps: 0.0,
                    watts: 0.0,
                    BTU: 0.0
                }
            },
            v_200: {
                typical: {
                    amps: 0.0,
                    watts: 0.0,
                    BTU: 0.0
                },
                worst: {
                    amps: 0.0,
                    watts: 0.0,
                    BTU: 0.0
                }
            }
        },
        rack_units: 0,
        max_psu: 0,
        weight_g: 0.0
    };
};

EnvironmentalSummary.prototype.create = function() {
    var _this = this;

    this._initSummary();

    _.forEach(_this._selectedHaGroups, function(hagroup) {
        var haGroupInspector = _this.inspect(hagroup);
        assert(haGroupInspector);

        _.forEach(hagroup.controllers, function() { //controller
            _this._addController(hagroup); //controller);
        });
        _.forEach(hagroup.shelves, function(shelf) {
            _this._addShelf(shelf);
        });
    });

    return this.summary;
};

EnvironmentalSummary.prototype._addPartPowerSpec = function(part) {
    var inspector = this.inspect(part),
        config = inspector.config || inspector.config(),
        powerSpec = config.stats.power_spec || config.stats.power.power_spec; // config.stats.power.with_internal

    this._addPowerSpecsToSummary(powerSpec);
};

EnvironmentalSummary.prototype._addController = function(controller) {
    var inspector = this.inspect(controller),
        stats = inspector.config.stats,
        powerSpec = stats.power.power_spec;

    if (!inspector.config.isEmbedded) {
        this._addSpecsToSummary(stats.rack_units, stats.max_psu, stats.weight.weight_g);
        this._addPowerSpecsToSummary(powerSpec);
    } // else stats.power.with_internal and stats.weight.with_internal handled by shelf(isEmbedded) and drive selection
    // TODO: allow not using the internal embedded shelf: need empty with_internal stats
};

EnvironmentalSummary.prototype._addShelf = function(shelf) {
    var inspector = this.inspect(shelf),
        shelfConfig = inspector.config(true),
        stats = shelfConfig.shelf.stats;
    var powerSpec = shelfConfig.power_spec; // shelfConfig.shelf.stats.power[0].power_spec;

    this._addSpecsToSummary(stats.rack_units, stats.max_psu, shelfConfig.weight_g);
    this._addPowerSpecsToSummary(powerSpec);
};

EnvironmentalSummary.prototype._addSpecsToSummary = function(rack_units, max_psu, weight_g) {
    this._updateCompleteStatsAvailable(rack_units && max_psu && weight_g);
    this.summary.rack_units += rack_units;
    this.summary.max_psu += max_psu;
    this.summary.weight_g += weight_g;
};

EnvironmentalSummary.prototype._addPowerSpecsToSummary = function(powerSpec) {
    this._updateCompleteStatsAvailable(powerSpec && powerSpec.v_100 && powerSpec.v_200);
    this.summary.power_spec = this._addPowerSpecs(this.summary.power_spec, powerSpec);
};

EnvironmentalSummary.prototype._updateCompleteStatsAvailable = function(available) {
    this.summary.completeStatsAvailable = this.summary.completeStatsAvailable && available;
};

EnvironmentalSummary.prototype._addPowerSpecs = function(a, b) {
    return {
        v_100: a.v_100 && b.v_100 ? this._addPowerSpecVoltages(a.v_100, b.v_100) : a.v_100 || b.v_100,
        v_200: a.v_200 && b.v_200 ? this._addPowerSpecVoltages(a.v_200, b.v_200) : a.v_200 || b.v_200
    };
};

EnvironmentalSummary.prototype._addPowerSpecVoltages = function(a, b) {
    return {
        typical: this._addPowerSpecCase(a.typical, b.typical),
        worst: this._addPowerSpecCase(a.worst, b.worst)
    };
};

EnvironmentalSummary.prototype._addPowerSpecCase = function(a, b) {
    return {
        amps: a.amps + b.amps,
        watts: a.watts + b.watts,
        BTU: a.BTU + b.BTU
    };
};

EnvironmentalSummary.prototype._nullToZero = function(val) {
    if (val === undefined || val === null) {
        return 0.0;
    }
    else {
        return val;
    }
};

EnvironmentalSummary.prototype.weightGtoKg = function(weightG) {
    return weightG / 1000;
};

EnvironmentalSummary.prototype.weightGtoLbs = function(weightG) {
    return weightG * 2.20462262185 / 1000;
};

EnvironmentalSummary.prototype.powerWattsToVoltAmps = function(watts) {
    var powerFactor = 0.95;
    return watts / powerFactor;
};

EnvironmentalSummary.prototype.powerWattsToKWhPerYear = function(watts) {
    return 8.76581277 * watts;
};

module.exports = EnvironmentalSummary;
