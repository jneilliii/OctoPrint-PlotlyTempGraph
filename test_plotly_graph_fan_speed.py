# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin

class TestFanSpeedGraph(octoprint.plugin.StartupPlugin):
	def __init__(self):
		self.last_fan_speeds = dict()

	def gcode_callback(self, comm, line, *args, **kwargs):
		if "M106" not in line:
			return line

		fan, fan_set_speed = line.replace("M106 ","").split()
		self.last_fan_speeds["fan{}".format(fan.replace("P",""))] = (int("{}".format(fan_set_speed.replace("S",""))), None)
		self._logger.info(self.last_fan_speeds)
		return line

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_fan_speeds)
		return parsed_temps

__plugin_name__ = "Test Plotly Graph Fan Speed"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = TestFanSpeedGraph()
__plugin_hooks__ = {
	"octoprint.comm.protocol.gcode.received": __plugin_implementation__.gcode_callback,
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}