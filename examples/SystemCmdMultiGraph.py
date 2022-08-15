# coding=utf-8

################################################################################
### SystemCmdMulti Plugin for Plotty Temp Graph plugin
### Allows multiple system commands to be used to query multiple temperature variables
### Based on plugin structure provided by jneilliii
###
### Jeffrey J. Kosowsky
### August 8, 2022
###
### Note: configure from cli using:
###       /home/kosowsky/octoprint/venv/bin/octoprint config set [-bool|-int] plugins.SystemCmdMultiGraph.<config_variable> <config_value>
###
################################################################################

from __future__ import absolute_import

import octoprint.plugin
from octoprint.util import RepeatedTimer
import subprocess

# Config default values
POLL_INTERVAL = 5 #Seconds

SYSTEM_CMDS = {
        'RPiCmd': {
                'cmd': "PATH='/usr/bin';vcgencmd measure_temp | sed 's/^temp=\([0-9.]*\).*/\\1/'",
                'precision': 1,
                'convertTo_celsius': False,
                'convertTo_fahrenheit': False,
        },
        'RPiCmd2': {
                'cmd': "printf '%.1f' $(cat /sys/class/thermal/thermal_zone0/temp)e-3",
                },
}

#NOTE: attributes: 'precision, 'convertTo_celsius', 'convertTo_fahrenheit' are *optional*
DEFAULT_PRECISION = 1

class SystemCmdMultiGraph(octoprint.plugin.StartupPlugin, octoprint.plugin.SettingsPlugin):
        def __init__(self):
                self.last_temps = dict()
                self.poll_temps = None

                self.poll_interval = None
                self.system_cmds = None

        def get_settings_defaults(self):
                return {
                        "poll_interval": POLL_INTERVAL,
                        "system_cmds": SYSTEM_CMDS,
                }

        def on_after_startup(self):
                self.poll_interval = self._settings.get_int(["poll_interval"])
                self.system_cmds = self._settings.get(["system_cmds"])
                for sensor in self.system_cmds :
                        sensorval = self.system_cmds[sensor]
                        if not hasattr(sensorval, 'precision'):
                                sensorval['precision'] = DEFAULT_PRECISION
                        if not hasattr(sensorval, 'convertTo_fahrenheit'):
                                sensorval['convertTo_fahrenheit'] = False
                        if not hasattr(sensorval, 'convertTo_celsius'):
                                sensorval['convertTo_fahrenheit'] = False
                        if not hasattr(sensorval, 'convertTo_celsius'):
                                sensorval['convertTo_celsius'] = False                                

                # start repeated timer for checking temp from sensor, runs every 5 seconds
                self.poll_temps = RepeatedTimer(self.poll_interval, self.read_temp)
                self.poll_temps.start()

        def read_temp(self):
                for sensor in self.system_cmds :
                        sensorval = self.system_cmds[sensor]
                        current_temp = None

                        try:
                                current_temp = float(subprocess.check_output(sensorval['cmd'], shell=True))

                                if current_temp:
                                        if sensorval['convertTo_fahrenheit']:
                                                current_temp = current_temp * 1.8 + 32
                                        elif sensorval['convertTo_celsius']:
                                                current_temp = (current_temp - 32) * 5/9
                                        current_temp = round(current_temp, sensorval['precision'])
                                        self.last_temps[sensor] = (current_temp, None)
#                                        self._logger.warning("JJK: {} : {}".format(sensor, current_temp)) #JJKDEBUG
                        except:
                                self._logger.debug("There was an error getting temperature from the SystemCmdMulti temperature plugin: {}".format(sensor))
#                                self._logger.warning ("Error getting temperature: {} : {}".format(sensor, sensorval)) #JJKDEBUG

        def temp_callback(self, comm, parsed_temps):
                parsed_temps.update(self.last_temps)
                return parsed_temps

__plugin_name__ = "SystemCmdMulti Plotly Temp Graph Integration"
__plugin_pythoncompat__ = ">=3,<4"
__plugin_version__ = "0.1.0"
__plugin_implementation__ = SystemCmdMultiGraph()
__plugin_hooks__ = {
        "octoprint.comm.protocol.temperatures.received": __plugin_implementation__.temp_callback
}