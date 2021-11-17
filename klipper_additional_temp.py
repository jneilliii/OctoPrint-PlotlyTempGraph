# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import re

class KlipperAdditionalTemp(octoprint.plugin.StartupPlugin):
	def __init__(self):
		self.last_rpi_speeds = dict()
		self.rpi_temp_regex = re.compile(r".+rpi:(?P<rpi>\d+\.\d).+")

	def gcode_callback(self, comm, line, *args, **kwargs):
		if "rpi:" not in line:
			return line

		rpi_match = self.rpi_temp_regex.match(line)
		rpi_speed = rpi_match.group("rpi")
		self.last_rpi_speeds["rpi"] = (float(rpi_speed), None)
		self._logger.info(self.last_rpi_speeds)
		return line

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_rpi_speeds)
		return parsed_temps

__plugin_name__ = "Klipper Additional Temps"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = KlipperAdditionalTemp()
__plugin_hooks__ = {
	"octoprint.comm.protocol.gcode.received": __plugin_implementation__.gcode_callback,
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}