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

		self.data = [];
		self.layout = {
			autosize: true,
			showlegend: true,
			legend: {"orientation": "h"},
			xaxis: { type:"date", tickformat:"%H:%M:%S", automargin: true, title: {standoff: 0},linecolor: 'black', linewidth: 2, mirror: true},
			yaxis: { type:"linear", automargin: true, title: {standoff: 0},linecolor: 'black', linewidth: 2, mirror: true },
			margin: {l:0,r:30,b:0,t:20,pad:5}
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

		self.onDataUpdaterPluginMessage = function(plugin, data) {
			if (plugin != "plotlytempgraph") {
				return;
			}
			var timestamp = new Date();

			var gd = document.getElementById('plotlytempgraph').data;
			var d3colors = Plotly.d3.scale.category10();
			
			for (var key in data) {
				var actual_index = gd.findIndex( ({ name }) => name === key + ' Actual');
				var target_index = gd.findIndex( ({ name }) => name === key + ' Target');
				if (actual_index < 0) {
					console.log('Adding line for "' + key + ' Actual" with color "' + d3colors(actual_index));
					Plotly.addTraces('plotlytempgraph',{name:key + ' Actual',x:[[timestamp]],y:[[data[key][0]]],mode: 'lines'});
					if(typeof data[key][1] !== 'undefined' && target_index < 0) {
						actual_index = gd.findIndex( ({ name }) => name === key + ' Actual');
						var target_color = pusher.color(d3colors(actual_index)).tint(0.5).html();
						console.log('Adding line for "' + key + ' Target" with color "' + target_color);
						Plotly.addTraces('plotlytempgraph',{name:key + ' Target',x:[[timestamp]],y:[[data[key][1]]],mode: 'lines',line:{color: target_color}});
					}
				} else {
					Plotly.extendTraces('plotlytempgraph', {x: [[timestamp]], y: [[data[key][0]]]}, [actual_index]);
					if(typeof data[key][1] !== 'undefined') {
						Plotly.extendTraces('plotlytempgraph', {x: [[timestamp]], y: [[data[key][1]]]}, [target_index]);
					}
				}
			}
		};
	}

	OCTOPRINT_VIEWMODELS.push({
		construct: PlotlytempgraphViewModel,
		dependencies: [ "loginStateViewModel" ],
		elements: [ /* ... */ ]
	});
});
