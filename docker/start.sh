#!/usr/bin/env bash

echo "Bootsrapping application"

#change it to an executable
chmod +x /var/www/corelocation/docker/run.sh
#run the deployment script inside the downloaded repo
/var/www/corelocation/docker/run.sh
#tail the logs to keep the container running
pm2 logs