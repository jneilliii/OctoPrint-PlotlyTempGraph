import random

def callback(comm, parsed_temps):
	parsed_temps.update(test = (random.uniform(99,101),100))
	parsed_temps.update(test2 = (random.uniform(199,201),200))
	return parsed_temps

__plugin_name__ = "Test Plotly Graph"
__plugin_pythoncompat__ = ">=2.7,<4"
__plugin_version__ = "0.1.0"
__plugin_hooks__ = {
	"octoprint.comm.protocol.temperatures.received": (callback, 1)
}