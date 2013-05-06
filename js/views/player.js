/**
 * @name views.player
 * @namespace View a single message.
 */
define(["db", "globals", "ui", "core/freeAgents", "core/player", "lib/faces", "lib/jquery", "lib/knockout", "lib/knockout.mapping", "util/bbgmView", "util/viewHelpers"], function (db, g, ui, freeAgents, player, faces, $, ko, komapping, bbgmView, viewHelpers) {
    "use strict";

    var mapping;

    function get(req) {
        return {
            pid: req.params.pid !== undefined ? parseInt(req.params.pid, 10) : undefined
        };
    }

    mapping = {
        player: {
            create: function (options) {
                return new function () {
                    komapping.fromJS(options.data, {
                        face: {
                            create: function (options) {
//console.log('mapping');
//console.log(options.data);
                                return ko.observable(options.data);
                            }
                        }
                    }, this);
                }();
            }
        }
    };

    function updatePlayer(inputs, updateEvents, vm) {
        var deferred, vars;

        deferred = $.Deferred();
        vars = {};

        if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || !vm.retired()) {
            g.dbl.transaction("players").objectStore("players").get(inputs.pid).onsuccess = function (event) {
                var attributes, currentRatings, data, p, ratings, stats;

                attributes = ["pid", "name", "tid", "abbrev", "teamRegion", "teamName", "pos", "age", "hgtFt", "hgtIn", "weight", "born", "contract", "draft", "face", "mood", "injury", "salaries", "salariesTotal", "awards", "freeAgentMood"];
                ratings = ["season", "abbrev", "age", "ovr", "pot", "hgt", "stre", "spd", "jmp", "endu", "ins", "dnk", "ft", "fg", "tp", "blk", "stl", "drb", "pss", "reb", "skills"];
                stats = ["season", "abbrev", "age", "gp", "gs", "min", "fg", "fga", "fgp", "fgAtRim", "fgaAtRim", "fgpAtRim", "fgLowPost", "fgaLowPost", "fgpLowPost", "fgMidRange", "fgaMidRange", "fgpMidRange", "tp", "tpa", "tpp", "ft", "fta", "ftp", "orb", "drb", "trb", "ast", "tov", "stl", "blk", "pf", "pts", "per"];

                p = db.getPlayer(event.target.result, null, null, attributes, stats, ratings, {playoffs: true, showNoStats: true, fuzz: true});

                // Account for extra free agent demands
                if (p.tid === g.PLAYER.FREE_AGENT) {
                    p.contract.amount = freeAgents.amountWithMood(p.contract.amount, p.freeAgentMood[g.userTid]);
                }

                currentRatings = p.ratings[p.ratings.length - 1];

                vars = {
                    player: p,
                    currentRatings: currentRatings,
                    showTradeFor: p.tid !== g.userTid && p.tid >= 0,
                    freeAgent: p.tid === g.PLAYER.FREE_AGENT,
                    retired: p.tid === g.PLAYER.RETIRED,
                    showContract: p.tid !== g.PLAYER.UNDRAFTED && p.tid !== g.PLAYER.RETIRED,
                    injured: p.injury.type !== "Healthy"
                };

                deferred.resolve(vars);
            };

            return deferred.promise();
        }
    }

    function uiFirst(vm) {
        ko.computed(function () {
            ui.title(vm.player.name());
        }).extend({throttle: 1});

        ko.computed(function () {
//console.log(vm.player.face())
            faces.display("picture", vm.player.face());
        }).extend({throttle: 1});
    }

    return bbgmView.init({
        id: "player",
        get: get,
        mapping: mapping,
        runBefore: [updatePlayer],
        uiFirst: uiFirst
    });
});