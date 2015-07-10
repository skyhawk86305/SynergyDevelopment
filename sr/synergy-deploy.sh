#!/bin/bash
sudo stop synergy
rm -rf /opt/synergy/*
redis-cli flushdb
tar -zxvf /home/thoughtworks/sr.tar.gz -C /opt/synergy
cp /home/thoughtworks/manifest.json /opt/synergy
cd /opt/synergy
npm install http://npt.techteam.netapp.com/hapi-tracer/-/hapi-tracer-0.4.1-2.tgz 
npm install http://npt.techteam.netapp.com/hapi-anode/-/hapi-anode-0.3.1.tgz 
npm install catbox-redis hapi@6.0.2 yar@2.3.2 debuglog
npm install
gulp build
gulp pack-scripts
SR_DEPLOYMENT="`npm pack`"
echo $SR_DEPLOYMENT
npm install $SR_DEPLOYMENT 
( cd node_modules/ ; ln -s ../ ./sr )
chmod +x start-synergy.sh
sudo start synergy
# runs upstart
##  /etc/init/synergy.conf
###   exec "/opt/synergy/start-synergy.sh"
####     node_modules/.bin/hapi -c manifest.json