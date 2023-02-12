# coding=utf-8

################################################################################
### MK3 Einsy Temperature Plugin for Plotty Temp Graph plugin
### Reads temperature from M105 command sent from MK3 while printing
### Based on plugin structure provided by jneilliii
###
### Jeffrey J. Kosowsky
### August 8, 2022
###
### To activate, store (copy) in: ~/.octoprint/plugins
### Note: configure from cli using:
###       ~/octoprint/venv/bin/octoprint config set [-bool|-int] plugins.MK3TempGraph.<config_variable> <config_value>
### e.g.,
###       ~/octoprint/venv/bin/octoprint config set -bool plugins.MK3TempGraph.convertTo_fahrenheit True
###
################################################################################

from __future__ import absolute_import

import octoprint.plugin
import re

# Config default values
SENSOR_NAME = "Einsy"
OUTPUT_PRECISION = 1 #Output precision in digits
TEMP_REGEX = ".+\sA:(?P<temp>\d+\.\d)"
#Note: M105 response is of form:
#      T:240.1 /240.0 B:80.1 /85.0 T0:240.1 /240.0 @:28 B@:127 P:0.0 A:40.0

class MK3TempGraph(octoprint.plugin.StartupPlugin, octoprint.plugin.SettingsPlugin):
        def __init__(self):
                self.last_temps = dict()

                self.sensor_name = None
                self.output_precision = None
                self.convertTo_celsius = None
                self.convertTo_fahrenheit = None
                self.temp_regex = None
                
        def get_settings_defaults(self):
                return {
                        "sensor_name": SENSOR_NAME,
                        "output_precision": 1,
                        "convertTo_celsius": False,
                        "convertTo_fahrenheit": False,
                        "temp_regex": TEMP_REGEX,
                }

        def on_after_startup(self):
                self.sensor_name = self._settings.get(["sensor_name"])
                self.output_precision = self._settings.get_int(["output_precision"])
                self.convertTo_celsius = self._settings.get_boolean(["convertTo_celsius"])
                self.convertTo_fahrenheit = self._settings.get_boolean(["convertTo_fahrenheit"])
                self.temp_regex = re.compile(self._settings.get(["temp_regex"]))

        def gcode_callback(self, comm, line, *args, **kwargs):
                if not line.startswith("T:"):
                        return line
#                self._logger.warning("JJK: {} : {}".format(self.sensor_name,line)) #JJKDEBUG                                
                
                try:
                        match = self.temp_regex.match(line)
                        current_temp = float(match.group("temp"))
                        if self.convertTo_fahrenheit:
                                current_temp = current_temp * 1.8 + 32
                        elif self.convertTo_celsius:
                                current_temp = (current_temp - 32) * 5/9

                        self.last_temps[self.sensor_name] = (current_temp, None)
#                        self._logger.warning("JJK: {} : {}".format(self.sensor_name, current_temp)) #JJKDEBUG                                

                except:
                        self._logger.debug("Error getting temperature from the MK3TempGraph temperature plugin")
#                        self._logger.warning ("Error getting temperature from the MK3TempGraph temperature plugin") #JJKDEBUG


                return line

        def temp_callback(self, comm, parsed_temps):
                parsed_temps.update(self.last_temps)
                return parsed_temps

__plugin_name__ = "MK3TempGraph Plotly Temp Graph Integration"
__plugin_pythoncompat__ = ">=3,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = MK3TempGraph()
__plugin_hooks__ = {
        "octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback,
        "octoprint.comm.protocol.gcode.received": __plugin_implementation__.gcode_callback
}