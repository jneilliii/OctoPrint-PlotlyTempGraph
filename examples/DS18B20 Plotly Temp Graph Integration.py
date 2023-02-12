# coding=utf-8
from __future__ import absolute_import

import octoprint.plugin
import os
import glob
import time
from octoprint.util import RepeatedTimer


class DS18B20Graph(octoprint.plugin.StartupPlugin):
	def __init__(self):
		self.last_temps = dict()
		self.poll_temps = None

	def on_after_startup(self):
		# initialize stuff
		os.system('modprobe w1-gpio')
		os.system('modprobe w1-therm')

		base_dir = '/sys/bus/w1/devices/'
		device_folder = glob.glob(base_dir + '28*')[0]
		self.device_file = device_folder + '/w1_slave'

		# start repeated timer for checking temp from sensor, runs every 5 seconds
		self.poll_temps = RepeatedTimer(5.0, self.read_temp)
		self.poll_temps.start()

	def read_temp(self):
		temp_c = None
		f = open(self.device_file, 'r')
		lines = f.readlines()
		while lines[0].strip()[-3:] != 'YES':
			time.sleep(0.2)
			lines = f.readlines()
			equals_pos = lines[1].find('t=')
			if equals_pos != -1:
				temp_string = lines[1][equals_pos+2:]
				temp_c = float(temp_string) / 1000.0
		self.last_temps["DS18B20"] = (temp_c, None)

	def temp_callback(self, comm, parsed_temps):
		parsed_temps.update(self.last_temps)
		return parsed_temps

__plugin_name__ = "DS18B20 Plotly Temp Graph Integration"
__plugin_pythoncompat__ = ">=3,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = DS18B20Graph()
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}
