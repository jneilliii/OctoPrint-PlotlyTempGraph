# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin


class PlotlytempgraphPlugin(octoprint.plugin.SettingsPlugin,
							octoprint.plugin.AssetPlugin,
							octoprint.plugin.TemplatePlugin):

	##~~ SettingsPlugin mixin

	def get_settings_defaults(self):
		return {
			"max_graph_height": 0,
			"name_map": [{"identifier": "tool0 actual", "label": "tool0 actual", "color": ""},
						 {"identifier": "tool0 trget", "label": "tool0 target", "color": ""},
						 {"identifier": "bed actual", "label": "bed actual", "color": ""},
						 {"identifier": "bed target", "label": "bed target", "color": ""},
						 {"identifier": "chamber actual", "label": "chamber actual", "color": ""},
						 {"identifier": "chamber target", "label": "chamber target", "color": ""}]
		}

	##~~ AssetPlugin mixin

	def get_assets(self):
		return dict(
			css=["css/spectrum.css"],
			js=["js/spectrum.js", "js/ko.colorpicker.js", "js/plotly-latest.min.js", "js/plotlytempgraph.js"]
		)

	def get_template_configs(self):
		return [
			dict(type="tab", name="Temperature", template="plotlytempgraph_tab.jinja2", replaces="temperature"),
			dict(type="settings", template="plotlytempgraph_settings.jinja2", replaces="temperature",
				 custom_bindings=False),
			dict(type="generic", template="plotlytempgraph.jinja2")
		]

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
				stable_branch=dict(
					name="Stable", branch="master", comittish=["master"]
				),
				prerelease_branches=[
					dict(
						name="Release Candidate",
						branch="rc",
						comittish=["rc", "master"],
					),
					dict(
						name="Development",
						branch="develop",
						comittish=["develop", "rc", "master"],
					)
				],
				# update method: pip
				pip="https://github.com/jneilliii/OctoPrint-PlotlyTempGraph/archive/{target_version}.zip"
			)
		)


__plugin_name__ = "Plotly Temp Graph"
__plugin_pythoncompat__ = ">=2.7,<4"


def __plugin_load__():
	global __plugin_implementation__
	__plugin_implementation__ = PlotlytempgraphPlugin()

	global __plugin_hooks__
	__plugin_hooks__ = {
		"octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
	}
