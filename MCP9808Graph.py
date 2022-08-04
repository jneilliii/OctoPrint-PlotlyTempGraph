# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
from octoprint.util import RepeatedTimer
import sys
import board
import adafruit_mcp9808


class MCP9808Graph(octoprint.plugin.StartupPlugin, octoprint.plugin.SettingsPlugin):
	def __init__(self):
		self.last_temps = dict()
		self.poll_temps = None
		self.i2c = board.I2C() # uses board.SCL and board.SDA
		self.addr = 0x18 #Default address with all set to low
		self.mcp = adafruit_mcp9808.MCP9808(i2c, address=addr)

	def get_settings_defaults(self):
		return {"use_fahrenheit": False}

	def on_after_startup(self):
		# start repeated timer for checking temp from sensor, runs every 5 seconds
		self.poll_temps = RepeatedTimer(5.0, self.read_temp)
		self.poll_temps.start()

	def read_temp(self):
		temp_c = None
		try:
			temp_c = mcp.temperature
			if temp_c:
				if self._settings.get_boolean(["use_fahrenheit"]):
					temp_c = tempC * 1.8 + 32
				self.last_temps["MCP9808"] = (temp_c, None)
		except:
			self._logger.debug("There was an error getting temperature from MCP9808")

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_temps)
		return parsed_temps

__plugin_name__ = "MCP9808 Plotly Temp Graph Integration"
__plugin_pythoncompat__ = ">=3,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = MCP9808Graph()
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}