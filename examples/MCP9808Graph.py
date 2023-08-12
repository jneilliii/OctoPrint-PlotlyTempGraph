# coding=utf-8

################################################################################
### MCP9808 Sensor Plugin for Plotty Temp Graph plugin
### Based on plugin structure provided by jneilliii
### Based on MCP9808 code provided by Adafruit and from Octoprint-Enclosure
### Plus reference to datasheet: https://ww1.microchip.com/downloads/en/DeviceDoc/25095A.pdf
###
### Jeffrey J. Kosowsky
### August 7, 2022
###
### Note: configure from cli using:
###       /home/kosowsky/octoprint/venv/bin/octoprint config set [-bool|-int] plugins.MCP9808Graph.<config_variable> <config_value>
###
################################################################################

from __future__ import absolute_import

import octoprint.plugin
from octoprint.util import RepeatedTimer
import smbus

# register addresses.
MCP9808_REG_CONFIG = 0x01
MCP9808_REG_UPPER_TEMP = 0x02
MCP9808_REG_LOWER_TEMP = 0x03
MCP9808_REG_CRIT_TEMP = 0x04
MCP9808_REG_AMBIENT_TEMP = 0x05
MCP9808_REG_MANUF_ID = 0x06
MCP9808_REG_DEVICE_ID = 0x07
MCP9808_REG_RESOLUTION = 0x08

# configuration register values.
MCP9808_REG_CONFIG_CONTCONV = 0x0000
MCP9808_REG_CONFIG_SHUTDOWN = 0x0100
MCP9808_REG_CONFIG_CRITLOCKED = 0x0080
MCP9808_REG_CONFIG_WINLOCKED = 0x0040
MCP9808_REG_CONFIG_INTCLR = 0x0020
MCP9808_REG_CONFIG_ALERTSTAT = 0x0010
MCP9808_REG_CONFIG_ALERTCTRL = 0x0008
MCP9808_REG_CONFIG_ALERTSEL = 0x0002
MCP9808_REG_CONFIG_ALERTPOL = 0x0002
MCP9808_REG_CONFIG_ALERTMODE = 0x0001

#Other chip defs (JJK)
MCP9808_RES_MEDIUM = 0x01
MCP9808_RES_HIGH = 0x02
MCP9808_RES_PRECISION = 0x03

# Config default values
SMBUS_NUMBER = 0x01 #Default (first) i2c bus
I2C_ADDR = 0x18 #Default i2c address with all set to low (0x18)
SENSOR_PRECISION = MCP9808_RES_PRECISION #Precision of the sensor itself
SENSOR_NAME = "MCP9808"
OUTPUT_PRECISION = 1 #Digits of output format resolution
UPDATE_PERIOD = 5 #Seconds

class MCP9808Graph(octoprint.plugin.StartupPlugin, octoprint.plugin.SettingsPlugin):
        def __init__(self):
                self.last_temps = dict()
                self.poll_temps = None

                self.smbus = None
                self.i2c_addr = None
                self.sensor_precision = None
                self.sensor_name = None
                self.output_precision = None
                self.convertTo_celsius = None
                self.convertTo_fahrenheit = None
                self.update_period = None

        def get_settings_defaults(self):
                return {
                        "smbus_number": SMBUS_NUMBER,
                        "i2c_addr": I2C_ADDR,
                        "sensor_precision": SENSOR_PRECISION,
                        "sensor_name": SENSOR_NAME,
                        "output_precision": OUTPUT_PRECISION,
                        "convertTo_celsius": False,
                        "convertTo_fahrenheit": False,
                        "update_period" : UPDATE_PERIOD,
                }


        def on_after_startup(self):
               self.smbus = smbus.SMBus(self._settings.get(["smbus_number"]))
                self.i2c_addr = self._settings.get(["i2c_addr"])
                self.sensor_precision = self._settings.get(["sensor_precision"])
                self.sensor_name = self._settings.get(["sensor_name"])
                self.output_precision = self._settings.get_int(["output_precision"])
                self.convertTo_celsius = self._settings.get_boolean(["convertTo_celsius"])
                self.convertTo_fahrenheit = self._settings.get_boolean(["convertTo_fahrenheit"])
                self.update_period = self._settings.get_int(["update_period"])

                mcp9808_config = [MCP9808_REG_CONFIG_CONTCONV, 0x00] #Continuous conversion mode, power-up default
                self.smbus.write_i2c_block_data(self.i2c_addr, MCP9808_REG_CONFIG, mcp9808_config)
                self.smbus.write_byte_data(self.i2c_addr, MCP9808_REG_RESOLUTION, self.sensor_precision) #High precision +0.0625 degC, 0x03(03)

                # start repeated timer for checking temp from sensor, runs every 5 seconds
                self.poll_temps = RepeatedTimer(self.update_period, self.read_temp)
                self.poll_temps.start()

        def read_temp(self):
                currtemp = None
                try:
                        data = self.smbus.read_i2c_block_data(self.i2c_addr, MCP9808_REG_AMBIENT_TEMP, 2) #2-byte temperature (temp-MSB, temp-LSB) from reg 0x05
                        #Note 16 bits of data are of form: AAASMMMM LLLLLLLL (where A=alert, M=MSB, L=LSB)
                        #i.e data is stored in 12-bits plus sign
                        #See https://ww1.microchip.com/downloads/en/DeviceDoc/25095A.pdf

                        currtemp = (data[0] & 0x0F) * 16 + data[1] * .0625 #Multiply MSB by 16, divide LSB by 16
                        if data[0] & 0x10: #Sign bit
                                currtemp = 256 - currtemp

                        if currtemp is not None:
                                if self.convertTo_fahrenheit:
                                        currtemp = currtemp * 1.8 + 32
                                elif self.convertTo_celsius:
                                        currtemp = (currtemp - 32) * 5/9
                                currtemp = round(currtemp, self.output_precision)
                                self.last_temps[self.sensor_name] = (currtemp, None)
#                                self._logger.warning("JJK: {} : {}".format(self.sensor_name, currtemp)) #JJKDEBUG
                except:
                        self._logger.debug("There was an error getting temperature from the MCP9808 temperature sensor")

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
