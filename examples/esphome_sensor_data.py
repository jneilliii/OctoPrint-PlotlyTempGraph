# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import requests
from octoprint.util import RepeatedTimer

esphome_address = "192.168.0.2"
sensor_id = "outside_temperature"

class ESPHomeSensorData(octoprint.plugin.StartupPlugin, octoprint.plugin.RestartNeedingPlugin):
	def __init__(self):
		self.polling_interval = 5
		self.repeated_timer = None
		self.esphome_data = dict()

	def get_esphome_data(self):
		esp_data = None

		webresponse = requests.get(f"http://{esphome_address}/sensor/{sensor_id}", timeout=10)
		response = webresponse.json()
		if "value" in response:
			esp_data = response["value"]
		self.esphome_data[sensor_id] = (esp_data, None)

	def on_after_startup(self):
		self.repeated_timer = RepeatedTimer(self.polling_interval, self.get_esphome_data)
		self.repeated_timer.start()

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.esphome_data)
		return parsed_temps

__plugin_name__ = "ESPHome Sensor Data"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = ESPHomeSensorData()
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}