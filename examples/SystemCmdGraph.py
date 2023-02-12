# coding=utf-8

################################################################################
### SystemCmd Plugin for Plotty Temp Graph plugin
### Based on plugin structure provided by jneilliii
###
### Jeffrey J. Kosowsky
### August 5, 2022
###
### Note: configure from cli using:
###       /home/kosowsky/octoprint/venv/bin/octoprint config set [-bool|-int] plugins.SystemCmdGraph-.<config_variable> <config_value>
###
################################################################################

from __future__ import absolute_import

import octoprint.plugin
from octoprint.util import RepeatedTimer
import subprocess

# Config default values
SENSOR_NAME = "RPi"
SENSOR_CMD = "PATH='/usr/bin';vcgencmd measure_temp | sed 's/^temp=\([0-9.]*\).*/\\1/'"
OUTPUT_PRECISION = 1 #Output precision in digits
UPDATE_PERIOD = 5 #Seconds

class SystemCmdGraph(octoprint.plugin.StartupPlugin, octoprint.plugin.SettingsPlugin):
        def __init__(self):
                self.last_temps = dict()
                self.poll_temps = None

                self.sensor_name = None
                self.sensor_cmd = None
                self.output_precision = None
                self.update_period = None
                self.convertTo_celsius = None
                self.convertTo_fahrenheit = None
                
        def get_settings_defaults(self):
                return {
                        "sensor_name": SENSOR_NAME,
                        "sensor_cmd": SENSOR_CMD,
                        "output_precision": 1,
                        "convertTo_celsius": False,
                        "convertTo_fahrenheit": False,
                        "update_period": UPDATE_PERIOD,
                }

        def on_after_startup(self):
                self.sensor_name = self._settings.get(["sensor_name"])
                self.sensor_cmd = self._settings.get(["sensor_cmd"])
                self.output_precision = self._settings.get_int(["output_precision"])                
                self.convertTo_celsius = self._settings.get_boolean(["convertTo_celsius"])
                self.convertTo_fahrenheit = self._settings.get_boolean(["convertTo_fahrenheit"])
                self.update_period = self._settings.get_int(["update_period"])

                # start repeated timer for checking temp from sensor, runs every 5 seconds
                self.poll_temps = RepeatedTimer(self.update_period, self.read_temp)
                self.poll_temps.start()

        def read_temp(self):
                currtemp = None

                try:
                        currtemp = float(subprocess.check_output(self.sensor_cmd, shell=True))

                        if currtemp:
                                if self.convertTo_fahrenheit:
                                        currtemp = currtemp * 1.8 + 32
                                elif self.convertTo_celsius:
                                        currtemp = (currtemp - 32) * 5/9
                                currtemp = round(currtemp, self.output_precision)
                                self.last_temps[self.sensor_name] = (currtemp, None)
#                                self._logger.warning("JJK: {} : {}".format(self.sensor_name, currtemp)) #JJKDEBUG
                except:
                        self._logger.debug("There was an error getting temperature from the SystemCmd temperature plugin")

        def temp_callback(self, comm, parsed_temps):
                parsed_temps.update(self.last_temps)
                return parsed_temps

__plugin_name__ = "SystemCmd Plotly Temp Graph Integration"
__plugin_pythoncompat__ = ">=3,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = SystemCmdGraph()
__plugin_hooks__ = {
        "octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}