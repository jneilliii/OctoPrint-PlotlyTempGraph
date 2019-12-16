import random
import logging

def callback(comm, parsed_temps):
	logging.getLogger("octoprint.plugins." + __name__).info(parsed_temps)
	parsed_temps.update(test = (random.randint(1,101),random.randint(1,101)))
	return parsed_temps

__plugin_name__ = "Test Plotly Graph"
__plugin_version__ = "0.1.0"
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": (callback, 1)
}