# OctoPrint-PlotlyTempGraph

This plugin replaces the default temperature tab of OctoPrint with a plotly graph that incorporates other data supplied by the return of plugin's [octoprint-comm-protocol-temperatures-received](https://docs.octoprint.org/en/master/plugins/hooks.html#octoprint-comm-protocol-temperatures-received) callbacks.

![screenshot](screenshot.png)

## Setup

Install via the bundled [Plugin Manager](https://github.com/foosel/OctoPrint/wiki/Plugin:-Plugin-Manager)
or manually using this URL:

    https://github.com/jneilliii/OctoPrint-PlotlyTempGraph/archive/master.zip

## Example Single File Plugins

These example single file plugins demonstrate how to feed additional temperature data into this plugin. To directly install, right-click a URL below and select `copy link address` (or similar) and paste into Plugin Manager > Get More > ...from URL and click `Install`. Otherwise, open these examples as starting points for creating your own. 

- [Adafruit MCP9808](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/MCP9808Graph.py), thanks to [@puterboy](https://github.com/puterboy)
- [System Command](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/SystemCmdGraph.py), thanks to [@puterboy](https://github.com/puterboy)
- [Multiple System Commands](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/SystemCmdMultiGraph.py), thanks to [@puterboy](https://github.com/puterboy)
- [Klipper Additional Temps](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/klipper_additional_temp.py) (unnecessary in OctoPrint versions 1.8.0+)
- [Prusa MK3 Einsy Temperature](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/MK3TempGraph.py), thanks to [@puterboy](https://github.com/puterboy) (unnecessary in OctoPrint versions 1.8.0+)
- [CPU Temperature](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/plotly_temp_graph_cpu_reporting.py) (using psutil)
- [CPU Temperature](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/RPiSysGraph.py) (using sysfs commands), thanks to [@puterboy](https://github.com/puterboy)
- [M106 Fan Speed](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/test_plotly_graph_fan_speed.py) (gcode received from printer, requires `REPORT_FAN_CHANGE` to be enabled in Marlin 2.0.6+)
- [Marlin Heater Power](https://raw.githubusercontent.com/jneilliii/OctoPrint-PlotlyTempGraph/master/examples/heater_temps.py), parses `@:0 B@:28` for nozzle and bed heater values

## Get Help

If you experience issues with this plugin or need assistance please use the issue tracker by clicking issues above.

### Additional Plugins

Check out my other plugins [here](https://plugins.octoprint.org/by_author/#jneilliii)

### Sponsors
- Andreas Lindermayr
- [@Mearman](https://github.com/Mearman)
- [@TheTuxKeeper](https://github.com/thetuxkeeper)
- [@tideline3d](https://github.com/tideline3d/)
- [OctoFarm](https://octofarm.net/)
- [SimplyPrint](https://simplyprint.dk/)
- [Andrew Beeman](https://github.com/Kiendeleo)
- [Calanish](https://github.com/calanish)
- [Lachlan Bell](https://lachy.io/)
- [Johnny Bergdal](https://github.com/bergdahl)
- [Leigh Johnson](https://github.com/leigh-johnson)
- [Stephen Berry](https://github.com/berrystephenw)
- [Guyot François](https://github.com/iFrostizz)
- [Steve Dougherty](https://github.com/Thynix)
## Support My Efforts
I, jneilliii, programmed this plugin for fun and do my best effort to support those that have issues with it, please return the favor and leave me a tip or become a Patron if you find this plugin helpful and want me to continue future development.

[![Patreon](patreon-with-text-new.png)](https://www.patreon.com/jneilliii) [![paypal](paypal-with-text.png)](https://paypal.me/jneilliii)

<small>No paypal.me? Send funds via PayPal to jneilliii&#64;gmail&#46;com</small>
