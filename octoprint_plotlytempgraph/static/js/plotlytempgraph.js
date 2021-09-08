$(function() {
	function PlotlytempgraphViewModel(parameters) {
		var self = this;

		self.loginState = parameters[0];
		self.settingsViewModel = parameters[1];
		self.access = parameters[2];

		self.trace_color_index = {};
		self.trace_color_incrementer = 0;
		self.trace_color_lookup = Plotly.d3.scale.category10();

		// plotly graphing related stuff
		self.data = [];
		self.layout = {
			autosize: true,
			showlegend: false,
			/* legend: {"orientation": "h"}, */
			xaxis: { type:"date", tickformat:"%H:%M:%S", automargin: true, title: {standoff: 0},linecolor: 'black', linewidth: 2, mirror: true},
			yaxis: { type:"linear", automargin: true, title: {standoff: 0}, linecolor: 'black', linewidth: 2, mirror: true },
			margin: { l:35, r:30, b:0, t:20, pad:5},
			images: [{"source": "/static/img/graph-background.png",
					"xref": "paper",
					"yref": "paper",
					"x": 0.5,
					"y": 0.5,
					"sizex": 0.75,
					"sizey": 0.75,
					"xanchor": "center",
					"yanchor": "middle",
					"layer": "below",
                    "name": "background",
                    "itemname": "background"}]
		};
		self.options = {
			showLink: false,
			sendData: false,
			displaylogo: false,
			displayModeBar: false,
			editable: false,
			showTips: false,
			responsive: true
		};
		self.legend_visible = ko.observable(false);

		self.toggle_legend = function(){
			self.legend_visible(self.legend_visible() ? false : true);
			Plotly.relayout('plotlytempgraph',{showlegend: self.legend_visible()});
		};

		Plotly.newPlot('plotlytempgraph', self.data, self.layout, self.options);

        self.settingsViewModel.addNameMapping = function() {
            self.settingsViewModel.settings.plugins.plotlytempgraph.name_map.push({"identifier": ko.observable(""), "label": ko.observable(""), "color": ko.observable("")});
        };

        self.settingsViewModel.removeNameMapping = function(data) {
            self.settingsViewModel.settings.plugins.plotlytempgraph.name_map.remove(data);
        };

        self.lookup_name = function(identifier) {
            let name_map = ko.utils.arrayFirst(self.settingsViewModel.settings.plugins.plotlytempgraph.name_map(), function(item){
               return item.identifier() == identifier;
            });
            if (name_map) {
                return name_map.label();
            } else {
                return identifier;
            }
        };

        self.lookup_color = function(key, subkey) {
            let name_map = ko.utils.arrayFirst(self.settingsViewModel.settings.plugins.plotlytempgraph.name_map(), function(item){
               return item.identifier() === key + ' ' + subkey;
            });
            if (name_map && name_map.color() !== '') {
                return name_map.color();
            } else {
                return self.trace_color_index[key];
            }
        };

		self._createToolEntry = function() {
			var entry = {
				name: ko.observable(),
				key: ko.observable(),
				actual: ko.observable(0),
				target: ko.observable(0),
				offset: ko.observable(0),
				newTarget: ko.observable(),
				newOffset: ko.observable()
			};

			entry.newTargetValid = ko.pureComputed(function() {
				var value = entry.newTarget();

				try {
					value = parseInt(value);
				} catch (exc) {
					return false;
				}

				return (value >= 0 && value <= 999);
			});

			entry.newOffsetValid = ko.pureComputed(function() {
				var value = entry.newOffset();

				try {
					value = parseInt(value);
				} catch (exc) {
					return false;
				}

				return (-50 <= value <= 50);
			});

			entry.offset.subscribe(function(newValue) {
				if (self.changingOffset.item !== undefined && self.changingOffset.item.key() === entry.key()) {
					// if our we currently have the offset dialog open for this entry and the offset changed
					// meanwhile, update the displayed value in the dialog
					self.changingOffset.offset(newValue);
				}
			});

			return entry;
		};

		self.changingOffset = {
			offset: ko.observable(0),
			newOffset: ko.observable(0),
			name: ko.observable(""),
			item: undefined,

			title: ko.pureComputed(function() {
				return _.sprintf(gettext("Changing Offset of %(name)s"), {name: _.escape(self.changingOffset.name())});
			}),
			description: ko.pureComputed(function() {
				return _.sprintf(gettext("Use the form below to specify a new offset to apply to all temperature commands sent from printed files for \"%(name)s\""),
					{name: _.escape(self.changingOffset.name())});
			})
		};
		self.changeOffsetDialog = undefined;

		// TODO: find some nicer way to update plot AFTER graph becomes visible
		self.loginStateSubscription = undefined;

		self.tools = ko.observableArray([]);
		self.hasTools = ko.pureComputed(function() {
			return self.tools().length > 0;
		});
		self.hasBed = ko.observable(true);
		self.hasChamber = ko.observable(false);
		self.sharedNozzle = ko.observable(false);

		self.visible = ko.pureComputed(function() {
			return self.hasTools() || self.hasBed();
		});

		self.bedTemp = self._createToolEntry();
		self.bedTemp["name"](gettext("Bed"));
		self.bedTemp["key"]("bed");

		self.chamberTemp = self._createToolEntry();
		self.chamberTemp["name"](gettext("Chamber"));
		self.chamberTemp["key"]("chamber");

		self.isErrorOrClosed = ko.observable(undefined);
		self.isOperational = ko.observable(undefined);
		self.isPrinting = ko.observable(undefined);
		self.isPaused = ko.observable(undefined);
		self.isError = ko.observable(undefined);
		self.isReady = ko.observable(undefined);
		self.isLoading = ko.observable(undefined);

		self.temperature_profiles = self.settingsViewModel.temperature_profiles;
		self.temperature_cutoff = self.settingsViewModel.temperature_cutoff;

		self.heaterOptions = ko.observable({});

		self._printerProfileInitialized = false;
		self._currentTemperatureDataBacklog = [];
		self._historyTemperatureDataBacklog = [];

		self._printerProfileUpdated = function() {
			var graphColors = ["red", "orange", "green", "brown", "purple"];
			var heaterOptions = {};
			var tools = [];
			var color;

			// tools
			var currentProfileData = self.settingsViewModel.printerProfiles.currentProfileData();
			var numExtruders = (currentProfileData ? currentProfileData.extruder.count() : 0);
			var sharedNozzle = (currentProfileData ? currentProfileData.extruder.sharedNozzle() : false);
			if (numExtruders && numExtruders > 1 && !sharedNozzle) {
				// multiple extruders
				for (var extruder = 0; extruder < numExtruders; extruder++) {
					color = graphColors.shift() || "black";
					heaterOptions["tool" + extruder] = {name: "T" + extruder, color: color};

					if (tools.length <= extruder || !tools[extruder]) {
						tools[extruder] = self._createToolEntry();
					}
					tools[extruder]["name"](gettext("Tool") + " " + extruder);
					tools[extruder]["key"]("tool" + extruder);
				}
				self.sharedNozzle(false);
			} else if (numExtruders === 1 || sharedNozzle) {
				// only one extruder, no need to add numbers
				color = graphColors[0];
				heaterOptions["tool0"] = {name: "T", color: color};

				if (tools.length < 1 || !tools[0]) {
					tools[0] = self._createToolEntry();
				}
				tools[0]["name"](gettext("Tool"));
				tools[0]["key"]("tool0");
				self.sharedNozzle(true);
			}

			// print bed
			if (currentProfileData && currentProfileData.heatedBed()) {
				self.hasBed(true);
				heaterOptions["bed"] = {name: gettext("Bed"), color: "blue"};
			} else {
				self.hasBed(false);
			}

			// heated chamber
			if (currentProfileData && currentProfileData.heatedChamber()) {
				self.hasChamber(true);
				heaterOptions["chamber"] = {name: gettext("Chamber"), color: "black"};
			} else {
				self.hasChamber(false);
			}

			// write back
			self.heaterOptions(heaterOptions);
			self.tools(tools);

			if (!self._printerProfileInitialized) {
				self._triggerBacklog();
			}
			//self.updatePlot();
		};

		self.settingsViewModel.printerProfiles.currentProfileData.subscribe(function() {
			self._printerProfileUpdated();
			self.settingsViewModel.printerProfiles.currentProfileData().extruder.count.subscribe(self._printerProfileUpdated);
			self.settingsViewModel.printerProfiles.currentProfileData().extruder.sharedNozzle.subscribe(self._printerProfileUpdated);
			self.settingsViewModel.printerProfiles.currentProfileData().heatedBed.subscribe(self._printerProfileUpdated);
			self.settingsViewModel.printerProfiles.currentProfileData().heatedChamber.subscribe(self._printerProfileUpdated);
		});

		//self.temperaturesself.temperatures = [];

		self.plot = undefined;
		self.plotHoverPos = undefined;
		self.plotLegendTimeout = undefined;

		self.fromCurrentData = function(data) {
			self._processStateData(data.state);
			if (!self._printerProfileInitialized) {
				self._currentTemperatureDataBacklog.push(data);
			} else {
				self._processTemperatureUpdateData(data.serverTime, data.temps);
			}
			if(data.temps.length > 0){
				self.plotTraces(data.temps);
			}
			self._processOffsetData(data.offsets);
		};

		self.fromHistoryData = function(data) {
			self._processStateData(data.state);
			if (!self._printerProfileInitialized) {
				self._historyTemperatureDataBacklog.push(data);
			} else {
				self._processTemperatureHistoryData(data.serverTime, data.temps);
			}
			if(data.temps.length > 0){
				var temperatures = data.temps;
				let checkIndex = temperatures.length - 1; // Dak0r: was looping length-1 but reading "0" before
				for(var key in temperatures[checkIndex]){
					if(key !== 'time'){
						if(typeof self.trace_color_index[key] === 'undefined') {
							self.trace_color_index[key] = self.trace_color_lookup(self.trace_color_incrementer);
							self.trace_color_incrementer++;
						}
						if(self.sharedNozzle() && key.match('tool[1-9][0-9]?')){
						    console.log('fromHistoryData');
						    continue;
                        }
						for(var subkey in temperatures[checkIndex][key]){
							if(temperatures[checkIndex][key][subkey] === null){
								continue;
							}
							try{
								var x_data = temperatures.map(function(currentValue, index, arr){return new Date(currentValue.time * 1000);});
								var y_data = temperatures.map(function(currentValue, index, arr){
									// Dak0r: Values might have not always existed, assuming 0 in that case
									if(currentValue[key]!==undefined){
										return currentValue[key][subkey];
									}else{
										return 0;
									}
								});

                                var name_map_identifier = self.lookup_name(key + ' ' + subkey);
                                var name_map_color = self.lookup_color(key, subkey);
								if(subkey === 'actual'){
									Plotly.addTraces('plotlytempgraph',{name: name_map_identifier, x: x_data, y: y_data, mode: 'lines', line: {color: name_map_color}, legendgroup: key});
								} else if(subkey === 'target' && y_data.filter(function(el){return el !== null;}).length > 0){
									Plotly.addTraces('plotlytempgraph',{name: name_map_identifier,x: x_data,y: y_data,mode: 'lines', line: {color: pusher.color(name_map_color).tint(0.5).html(), dash: 'dot'}, legendgroup: key});
								}
							}catch(e){
								console.error("Error plotting history data for "+key);
								console.error(e);
							}
						}
					}
				}
			}
			self._processOffsetData(data.offsets);
		};

		self.plotTraces = function(temperatures) {
			var gd = document.getElementById('plotlytempgraph').data;
			const cutOffDate = (element) => element < new moment().subtract(parseInt(self.temperature_cutoff()), 'minutes').toDate();

			let cutOffCount = 0; // Dak0r: This sometimes throws an exception, haven't looked into it, yet. Using 0 as default if it happens

            if(gd.length) {
                cutOffCount = gd[0].x.length - gd[0].x.findIndex(cutOffDate);
            }
			for(var i=0;i<temperatures.length;i++){
				for (var key in temperatures[i]) {
					var timestamp = new Date(temperatures[i].time * 1000);
					if(key !== 'time'){
						if(typeof self.trace_color_index[key] === 'undefined') {
							self.trace_color_index[key] = self.trace_color_lookup(self.trace_color_incrementer);
							self.trace_color_incrementer++;
						}
						if (self.sharedNozzle() && key.match('tool[1-9][0-9]*')) {
						    console.log('plotTraces');
						    continue;
                        }
						for(var subkey in temperatures[i][key]){
							if(temperatures[i][key][subkey] === null){
								continue;
							}
                            var name_map_identifier = self.lookup_name(key + ' ' + subkey);
                            var name_map_color = self.lookup_color(key, subkey);
							var index = gd.findIndex( ({ name }) => name === name_map_identifier );
							if(index < 0) {
                                if (subkey === 'actual') {
                                    Plotly.addTraces('plotlytempgraph', {
                                        name: name_map_identifier,
                                        x: [timestamp,timestamp],
                                        y: [temperatures[i][key][subkey],temperatures[i][key][subkey]],
                                        mode: 'lines',
                                        line: {color: name_map_color},
                                        legendgroup: key
                                    });
                                } else if (subkey === 'target' && temperatures[i][key][subkey] != null) {
                                    Plotly.addTraces('plotlytempgraph', {
                                        name: name_map_identifier,
                                        x: [timestamp,timestamp],
                                        y: [temperatures[i][key][subkey],temperatures[i][key][subkey]],
                                        mode: 'lines',
                                        line: {
                                            color: pusher.color(name_map_color).tint(0.5).html(),
                                            dash: 'dot'
                                        },
                                        legendgroup: key
                                    });
                                } else {
                                    console.log("Don't know what to do: " + key + " - " + subkey + " - " + cutOffCount + " - " + index);
                                }
                            } else {
								Plotly.extendTraces('plotlytempgraph', {x: [[timestamp]], y: [[temperatures[i][key][subkey]]]}, [index], (cutOffCount > 0) ? cutOffCount : null);
							}
						}
					}
				}
			}
		};

		self._triggerBacklog = function() {
			_.each(self._historyTemperatureDataBacklog, function(data) {
				self._processTemperatureHistoryData(data.serverTime, data.temps);
			});
			_.each(self._currentTemperatureDataBacklog, function(data) {
				self._processTemperatureUpdateData(data.serverTime, data.temps);
			});
			self._historyTemperatureDataBacklog = [];
			self._currentTemperatureDataBacklog = [];
			self._printerProfileInitialized = true;
		};

		self._processStateData = function(data) {
			self.isErrorOrClosed(data.flags.closedOrError);
			self.isOperational(data.flags.operational);
			self.isPaused(data.flags.paused);
			self.isPrinting(data.flags.printing);
			self.isError(data.flags.error);
			self.isReady(data.flags.ready);
			self.isLoading(data.flags.loading);
		};

		self._processTemperatureUpdateData = function(serverTime, data) {
			if (data.length === 0)
				return;

			var lastData = data[data.length - 1];

			var tools = self.tools();
			for (var i = 0; i < tools.length; i++) {
				if (lastData.hasOwnProperty("tool" + i)) {
					tools[i]["actual"](lastData["tool" + i].actual);
					tools[i]["target"](lastData["tool" + i].target);
				} else {
					tools[i]["actual"](0);
					tools[i]["target"](0);
				}
			}

			if (lastData.hasOwnProperty("bed")) {
				self.bedTemp["actual"](lastData.bed.actual);
				self.bedTemp["target"](lastData.bed.target);
			} else {
				self.bedTemp["actual"](0);
				self.bedTemp["target"](0);
			}

			if (lastData.hasOwnProperty("chamber")) {
				self.chamberTemp["actual"](lastData.chamber.actual);
				self.chamberTemp["target"](lastData.chamber.target);
			} else {
				self.chamberTemp["actual"](0);
				self.chamberTemp["target"](0);
			}

			if (!CONFIG_TEMPERATURE_GRAPH) return;

			self.temperatures = self._processTemperatureData(serverTime, data, self.temperatures);
			//self.updatePlot();
		};

		self._processTemperatureHistoryData = function(serverTime, data) {
			self.temperatures = self._processTemperatureData(serverTime, data);
			//self.updatePlot();
		};

		self._processOffsetData = function(data) {
			var tools = self.tools();
			for (var i = 0; i < tools.length; i++) {
				if (data.hasOwnProperty("tool" + i)) {
					tools[i]["offset"](data["tool" + i]);
				} else {
					tools[i]["offset"](0);
				}
			}

			if (data.hasOwnProperty("bed")) {
				self.bedTemp["offset"](data["bed"]);
			} else {
				self.bedTemp["offset"](0);
			}

			if (data.hasOwnProperty("chamber")) {
				self.chamberTemp["offset"](data["chamber"]);
			} else {
				self.chamberTemp["offset"](0);
			}
		};

		self._processTemperatureData = function(serverTime, data, result) {
			var types = _.keys(self.heaterOptions());
			var clientTime = Date.now();

			// make sure result is properly initialized
			if (!result) {
				result = {};
			}

			_.each(types, function(type) {
				if (!result.hasOwnProperty(type)) {
					result[type] = {actual: [], target: []};
				}
				if (!result[type].hasOwnProperty("actual")) result[type]["actual"] = [];
				if (!result[type].hasOwnProperty("target")) result[type]["target"] = [];
			});
            // convert data
            _.each(data, function(d) {
                var timeDiff = (serverTime - d.time) * 1000;
                var time = clientTime - timeDiff;
                _.each(types, function(type) {
                    if (!d[type]) return;
                    result[type].actual.push([time, d[type].actual]);
                    result[type].target.push([time, d[type].target]);
                });
            });

			var temperature_cutoff = self.temperature_cutoff();
			if (temperature_cutoff !== undefined) {
				var filterOld = function(item) {
					return item[0] >= clientTime - temperature_cutoff * 60 * 1000;
				};

				_.each(_.keys(self.heaterOptions()), function(d) {
					result[d].actual = _.filter(result[d].actual, filterOld);
					result[d].target = _.filter(result[d].target, filterOld);
				});
			}
			return result;
		};

		self.profileText = function (heater, profile) {
            var text = gettext("Set %(name)s (%(value)s)");

            var format = function (temp) {
                if (temp === 0 || temp === undefined || temp === null) {
                    return gettext("Off");
                } else {
                    return "" + temp + "°C";
                }
            };

            var value;
            if (heater === "all") {
                value = gettext("Tool") + ": %(extruder)s";
                if (self.hasBed()) {
                    value += "/" + gettext("Bed") + ": %(bed)s";
                }
                if (self.hasChamber()) {
                    value += "/" + gettext("Chamber") + ": %(chamber)s";
                }
                value = _.sprintf(value, {
                    extruder: format(profile.extruder),
                    bed: format(profile.bed),
                    chamber: format(profile.chamber)
                });
            } else if (heater.key() === "bed") {
                value = format(profile.bed);
            } else if (heater.key() === "chamber") {
                value = format(profile.chamber);
            } else {
                value = format(profile.extruder);
            }

            return _.sprintf(text, {
                name: _.escape(profile.name),
                value: _.escape(value)
            });
        };

		self.getMaxTemp = function(actuals, targets) {
			var maxTemp = 0;
			actuals.forEach(function(pair) {
				if (pair[1] > maxTemp){
					maxTemp = pair[1];
				}
			});
			targets.forEach(function(pair) {
				if (pair[1] > maxTemp){
					maxTemp = pair[1];
				}
			});
			return maxTemp;
		};

		self.incrementTarget = function(item) {
			var value = item.newTarget();
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
				value = item.target();
			}
			try {
				value = parseInt(value);
				if (value > 999) return;
				item.newTarget(value + 1);
				self.autosendTarget(item);
			} catch (ex) {
				// do nothing
			}
		};

		self.decrementTarget = function(item) {
			var value = item.newTarget();
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
				value = item.target();
			}
			try {
				value = parseInt(value);
				if (value <= 0) return;
				item.newTarget(value - 1);
				self.autosendTarget(item);
			} catch (ex) {
				// do nothing
			}
		};

		var _sendTimeout = {};

		self.autosendTarget = function(item) {
			if (!self.settingsViewModel.plugins.plotlytempgraph.temperature_sendAutomatically()) return;
			var delay = self.settingsViewModel.plugins.plotlytempgraph.temperature_sendAutomaticallyAfter() * 1000;

			var name = item.name();
			if (_sendTimeout[name]) {
				window.clearTimeout(_sendTimeout[name]);
			}
			_sendTimeout[name] = window.setTimeout(function() {
				self.setTarget(item);
				delete _sendTimeout[name];
			}, delay);
		};

		self.clearAutosendTarget = function(item) {
			var name = item.name();
			if (_sendTimeout[name]) {
				window.clearTimeout(_sendTimeout[name]);
				delete _sendTimeout[name];
			}
		};

		self.setTarget = function(item, form) {
			var value = item.newTarget();
			if (form !== undefined) {
				$(form).find("input").blur();
			}
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) return OctoPrintClient.createRejectedDeferred();

			self.clearAutosendTarget(item);
			return self.setTargetToValue(item, value);
		};

		// Wrapper of self.setTargetFromProfile() to apply all the temperature from a temperature profile
        self.setTargetsFromProfile = function (temperatureProfile) {
            if (temperatureProfile === undefined) {
                console.log("temperatureProfile is undefined!");
                return;
            }

            if (self.hasBed()) {
                self.setTargetFromProfile(self.bedTemp, temperatureProfile);
            }

            if (self.hasChamber()) {
                self.setTargetFromProfile(self.chamberTemp, temperatureProfile);
            }

            self.tools().forEach(function (element) {
                self.setTargetFromProfile(element, temperatureProfile);
            });
        };

		self.setTargetFromProfile = function(item, profile) {
			if (!profile) return OctoPrintClient.createRejectedDeferred();

			self.clearAutosendTarget(item);

			var target;
			if (item.key() === "bed") {
				target = profile.bed;
			} else if (item.key() === "chamber") {
				target = profile.chamber;
			} else {
				target = profile.extruder;
			}

			if (target === undefined) target = 0;
			return self.setTargetToValue(item, target);
		};

		// Wrapper of self.setTargetToZero() to set off all the temperatures
        self.setTargetsToZero = function () {
            if (self.hasBed()) {
                self.setTargetToZero(self.bedTemp);
            }

            if (self.hasChamber()) {
                self.setTargetToZero(self.chamberTemp);
            }

            self.tools().forEach(function (element) {
                self.setTargetToZero(element);
            });
        };

		self.setTargetToZero = function(item) {
			self.clearAutosendTarget(item);
			return self.setTargetToValue(item, 0);
		};

		self.setTargetToValue = function(item, value) {
			self.clearAutosendTarget(item);

			try {
				value = parseInt(value);
			} catch (ex) {
				return OctoPrintClient.createRejectedDeferred();
			}

			if (value < 0 || value > 999) return OctoPrintClient.createRejectedDeferred();

			var onSuccess = function() {
				item.target(value);
				item.newTarget("");
			};

			if (item.key() === "bed") {
				return self._setBedTemperature(value)
					.done(onSuccess);
			} else if (item.key() === "chamber") {
				return self._setChamberTemperature(value)
					.done(onSuccess);
			} else {
				return self._setToolTemperature(item.key(), value)
					.done(onSuccess);
			}
		};

		self.changeOffset = function(item) {
			// copy values
			self.changingOffset.item = item;
			self.changingOffset.name(item.name());
			self.changingOffset.offset(item.offset());
			self.changingOffset.newOffset(item.offset());

			self.changeOffsetDialog.modal("show");
		};

		self.incrementChangeOffset = function() {
			var value = self.changingOffset.newOffset();
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) value = self.changingOffset.offset();
			try {
				value = parseInt(value);
				if (value >= 50) return;
				self.changingOffset.newOffset(value + 1);
			} catch (ex) {
				// do nothing
			}
		};

		self.decrementChangeOffset = function() {
			var value = self.changingOffset.newOffset();
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) value = self.changingOffset.offset();
			try {
				value = parseInt(value);
				if (value <= -50) return;
				self.changingOffset.newOffset(value - 1);
			} catch (ex) {
				// do nothing
			}
		};

		self.deleteChangeOffset = function() {
			self.changingOffset.newOffset(0);
		};

		self.confirmChangeOffset = function() {
			var item = self.changingOffset.item;
			item.newOffset(self.changingOffset.newOffset());

			self.setOffset(item)
				.done(function() {
					self.changeOffsetDialog.modal("hide");

					// reset
					self.changingOffset.offset(0);
					self.changingOffset.newOffset(0);
					self.changingOffset.name("");
					self.changingOffset.item = undefined;
				})
		};

		self.setOffset = function(item) {
			var value = item.newOffset();
			if (value === undefined || (typeof(value) === "string" && value.trim() === "")) return OctoPrintClient.createRejectedDeferred();
			return self.setOffsetToValue(item, value);
		};

		self.setOffsetToZero = function(item) {
			return self.setOffsetToValue(item, 0);
		};

		self.setOffsetToValue = function(item, value) {
			try {
				value = parseInt(value);
			} catch (ex) {
				return OctoPrintClient.createRejectedDeferred();
			}

			if (value < -50 || value > 50) return OctoPrintClient.createRejectedDeferred();

			var onSuccess = function() {
				item.offset(value);
				item.newOffset("");
			};

			if (item.key() === "bed") {
				return self._setBedOffset(value)
					.done(onSuccess);
			} else if (item.key() === "chamber") {
				return self._setChamberOffset(value)
					.done(onSuccess);
			} else {
				return self._setToolOffset(item.key(), value)
					.done(onSuccess);
			}
		};

		self._setToolTemperature = function(tool, temperature) {
			var data = {};
			data[tool] = parseInt(temperature);
			return OctoPrint.printer.setToolTargetTemperatures(data);
		};

		self._setToolOffset = function(tool, offset) {
			var data = {};
			data[tool] = parseInt(offset);
			return OctoPrint.printer.setToolTemperatureOffsets(data);
		};

		self._setBedTemperature = function(temperature) {
			return OctoPrint.printer.setBedTargetTemperature(parseInt(temperature));
		};

		self._setBedOffset = function(offset) {
			return OctoPrint.printer.setBedTemperatureOffset(parseInt(offset));
		};

		self._setChamberTemperature = function(temperature) {
			return OctoPrint.printer.setChamberTargetTemperature(parseInt(temperature));
		};

		self._setChamberOffset = function(offset) {
			return OctoPrint.printer.setChamberTemperatureOffset(parseInt(offset));
		};

		self._replaceLegendLabel = function(index, series, value, emph) {
			var showFahrenheit = self._shallShowFahrenheit();

			var temp;
			if (index % 2 === 0) {
				// actual series
				temp = formatTemperature(value, showFahrenheit);
			} else {
				// target series
				temp = formatTemperature(value, showFahrenheit, 1);
			}
			if (emph) {
				temp = "<em>" + temp + "</em>";
			}
			series.label = series.label.replace(/:.*/, ": " + temp);
		};

		self._shallShowFahrenheit = function() {
			return (self.settingsViewModel.settings !== undefined )
				   ? self.settingsViewModel.settings.appearance.showFahrenheitAlso()
				   : false;
		};

		self.handleEnter = function(event, type, item) {
			if (event.keyCode === 13) {
				if (type === "target") {
					self.setTarget(item)
						.done(function() {
							event.target.blur();
						});
				} else if (type === "offset") {
					self.confirmChangeOffset();
				}
			}
		};

		self.handleFocus = function(event, type, item) {
			if (type === "target") {
				var value = item.newTarget();
				if (value === undefined || (typeof(value) === "string" && value.trim() === "")) {
					item.newTarget(item.target());
				}
				window.setTimeout(function() {
					event.target.select();
				}, 0);
			} else if (type === "offset") {
				window.setTimeout(function() {
					event.target.select();
				}, 0);
			}
		};

		self.onAfterBinding = function(){
		    self.resize_graph_height();
        }

		self.onSettingsHidden = function(){
		    self.resize_graph_height();
        }

        self.resize_graph_height = function(){
		    if(self.settingsViewModel.settings.plugins.plotlytempgraph.max_graph_height()>0){
		        console.log('plotlytempgraph', 'resizing temp graph to range');
		        Plotly.relayout('plotlytempgraph',{'yaxis.range': [0, self.settingsViewModel.settings.plugins.plotlytempgraph.max_graph_height()]});
            } else {
		        Plotly.relayout('plotlytempgraph',{'yaxis.autorange': true});
            }
		    if(self.settingsViewModel.settings.plugins.custombackground) {
                Plotly.relayout('plotlytempgraph',{'images': [{"source": self.settingsViewModel.settings.plugins.custombackground.background_url(),
                                    "xref": "paper",
                                    "yref": "paper",
                                    "x": 0.5,
                                    "y": 0.5,
                                    "sizex": 1,
                                    "sizey": 1,
                                    "xanchor": "center",
                                    "yanchor": "middle",
                                    "layer": "below",
                                    "name": "background",
                                    "itemname": "background"}]});
            }
        }

		self.onStartup = function() {
			self.changeOffsetDialog = $("#plotly_change_offset_dialog");
		};

		self.onStartupComplete = function() {
			//self.initOrUpdate();
			self._printerProfileUpdated();
		};

		self.onUserPermissionsChanged = self.onUserLoggedIn = self.onUserLoggedOut = function() {
			//self.initOrUpdate();
		};

		self.onAfterTabChange = function(current, previous){
			if (current !== "#tab_plugin_plotlytempgraph") {
				return
			}
			// hack for UI Customizer plugin conflict on sizing
			Plotly.relayout('plotlytempgraph',{});
		}
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: PlotlytempgraphViewModel,
		dependencies: ["loginStateViewModel", "settingsViewModel", "accessViewModel"],
		elements: ["#tab_plugin_plotlytempgraph", "#tab_plugin_plotlytempgraph_link", "#plotly_change_offset_dialog"]
	});
});
