# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import psutil
from octoprint.util import RepeatedTimer

class CPUTempGraph(octoprint.plugin.StartupPlugin, octoprint.plugin.RestartNeedingPlugin):
	def __init__(self):
		self.polling_interval = 5
		self.repeated_timer = None
		self.last_cpu_temp = dict()

	def __get_cpu_temp(self, temp):
		if temp is None:
			return None
		cpu_temp = None
		if "coretemp" in temp:
			cpu_temp = temp["coretemp"][0].current
		if "cpu-thermal" in temp:
			cpu_temp = temp["cpu-thermal"][0].current
		if "cpu_thermal" in temp:
			cpu_temp = temp["cpu_thermal"][0].current
		if "soc_thermal" in temp:
			cpu_temp = temp["soc_thermal"][0].current
		return cpu_temp

	def get_cpu_temp(self):
		temps_celsius = None
		if hasattr(psutil, "sensors_temperatures"):
			temps_celsius = psutil.sensors_temperatures()
			self._logger.debug("sensors_temperatures() : %r" % (temps_celsius,))
		temps_c = self.__get_cpu_temp(temps_celsius)
		self.last_cpu_temp["CPU"] = (temps_c, None)

	def on_after_startup(self):
		self.repeated_timer = RepeatedTimer(self.polling_interval, self.get_cpu_temp)
		self.repeated_timer.start()

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_cpu_temp)
		return parsed_temps

__plugin_name__ = "Plotly Temp Graph CPU Reporting"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = CPUTempGraph()
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}