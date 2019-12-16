# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin

class PlotlytempgraphPlugin(octoprint.plugin.SettingsPlugin,
                            octoprint.plugin.AssetPlugin,
                            octoprint.plugin.TemplatePlugin):

	##~~ SettingsPlugin mixin

	def get_settings_defaults(self):
		return dict(
			# put your plugin's default settings here
		)

	##~~ AssetPlugin mixin

	def get_assets(self):
		return dict(
			js=["js/plotly-latest.min.js","js/plotlytempgraph.js"]
		)

	## Temperatures received hook and add_trace helper

	def temp_received(self, comm, parsed_temps):
		self._plugin_manager.send_plugin_message(self._identifier, parsed_temps)
		return parsed_temps

	##~~ Softwareupdate hook

	def get_update_information(self):
		return dict(
			plotlytempgraph=dict(
				displayName="Plotly Temp Graph",
				displayVersion=self._plugin_version,

				# version check: github repository
				type="github_release",
				user="jneilliii",
				repo="OctoPrint-PlotlyTempGraph",
				current=self._plugin_version,

				# update method: pip
				pip="https://github.com/jneilliii/OctoPrint-PlotlyTempGraph/archive/{target_version}.zip"
			)
		)

__plugin_name__ = "Plotly Temp Graph"

def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = PlotlytempgraphPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
		"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_received
	}

