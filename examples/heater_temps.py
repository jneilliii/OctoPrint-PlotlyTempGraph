# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import re

class HeaterTemp(octoprint.plugin.StartupPlugin, octoprint.plugin.RestartNeedingPlugin):
	def __init__(self):
		self.last_heater_temps = dict()
		self.heater_temp_regex = re.compile(r".+@:(?P<nozzle_heater>\d+)\sB@:(?P<bed_heater>\d+)")

	def gcode_callback(self, comm, line, *args, **kwargs):
		if "@:" not in line:
			return line

		heater_temp_matches = self.heater_temp_regex.match(line)
		nozzle_heater = heater_temp_matches.group("nozzle_heater")
		bed_heater = heater_temp_matches.group("bed_heater")
		self.last_heater_temps["nozzle_heater"] = (float(nozzle_heater), None)
		self.last_heater_temps["bed_heater"] = (float(bed_heater), None)
		self._logger.debug(self.last_heater_temps)
		return line

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_heater_temps)
		return parsed_temps

__plugin_name__ = "Heater Temps"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = HeaterTemp()
__plugin_hooks__ = {
	"octoprint.comm.protocol.gcode.received": __plugin_implementation__.gcode_callback,
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}