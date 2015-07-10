#!/bin/bash
cd /opt/synergy
#sudo node_modules/.bin/hapi -c manifest.json 1> /var/log/synergy/stdout.log 2> /var/log/synergy/stderr.log
node_modules/.bin/hapi -c manifest.json
