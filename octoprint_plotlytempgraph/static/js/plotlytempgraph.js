/*
 * View model for OctoPrint-PlotlyTempGraph
 *
 * Author: jneilliii
 * License: AGPLv3
 */
$(function() {
	function PlotlytempgraphViewModel(parameters) {
		var self = this;

		self.loginStateViewModel = parameters[0];
		self.settingsViewModel = parameters[1];

		self.data = [];
		self.layout = {
			autosize: true,
			showlegend: true,
			legend: {"orientation": "h"},
			xaxis: { type:"date", tickformat:"%H:%M:%S", automargin: true, title: {standoff: 0},linecolor: 'black', linewidth: 2, mirror: true},
			yaxis: { type:"linear", automargin: true, title: {standoff: 0},linecolor: 'black', linewidth: 2, mirror: true },
			margin: {l:35,r:30,b:0,t:20,pad:5}
		};
		self.options = {
			showLink: false,
			sendData: false,
			displaylogo: false,
			displayModeBar: false,
			editable: false,
			showTips: false
		};

		Plotly.newPlot('plotlytempgraph', self.data, self.layout, self.options);

		self.fromCurrentData = function(data) {
			if(data.temps.length > 0){
				self.plotTraces(data.temps);
			}
		};

		self.fromHistoryData = function(data) {
			if(data.temps.length > 0){
				var temperatures = data.temps;
				console.log(temperatures);
				for(var key in temperatures[temperatures.length - 1]){
					if(key !== 'time'){
						for(var subkey in temperatures[0][key]){
							var x_data = temperatures.map(function(currentValue, index, arr){return new Date(currentValue.time * 1000);});
							var y_data = temperatures.map(function(currentValue, index, arr){return currentValue[key][subkey];});
							if(subkey == 'actual'){
								Plotly.addTraces('plotlytempgraph',{name:subkey + ' ' + key,x:x_data,y:y_data,mode: 'lines'});
							} else if(subkey == 'target'){
								Plotly.addTraces('plotlytempgraph',{name: subkey + ' ' + key,x: x_data,y: y_data,mode: 'lines'});
							}
						}
					}
				}
			}
		};

		self.plotTraces = function(temperatures) {
			for(var i=0;i<temperatures.length;i++){
				for (var key in temperatures[i]) {
					var timestamp = new Date(temperatures[i].time * 1000);
					if(key !== 'time'){
						for(var subkey in temperatures[i][key]){
							var gd = document.getElementById('plotlytempgraph').data;
							var index = gd.findIndex( ({ name }) => name === subkey + ' ' + key);
							if(index < 0){
								if(subkey == 'actual'){
									Plotly.addTraces('plotlytempgraph',{name:subkey + ' ' + key,x:[[timestamp]],y:[[temperatures[i][key][subkey]]],mode: 'lines'});
								} else if(subkey == 'target'){
									Plotly.addTraces('plotlytempgraph',{name:subkey + ' ' + key,x:[[timestamp]],y:[[temperatures[i][key][subkey]]],mode: 'lines'});
								}
							} else {
								Plotly.extendTraces('plotlytempgraph', {x: [[timestamp]], y: [[temperatures[i][key][subkey]]]}, [index]);
							}
						}
					}
				}
			}
		}
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: PlotlytempgraphViewModel,
		dependencies: [ "loginStateViewModel", "settingsViewModel" ],
		elements: [ /* ... */ ]
	});
});
