# cd $PROJECT_FOLDER

# echo "BRANCH: " $BRANCH

#create a .env file containing the environment variables
env | sed "s/\([a-z0-9A-Z_\-\s\.]*\)=\(.*\)/\1='\2'/" > /var/www/corelocation/.env

#change owner to www-data for nginx
chown -R www-data:www-data /var/www
cd /var/www

#modify the permissions for all files to 777
chmod -R 777 /var/www/

cd /var/www/corelocation
pm2 list
#include all consumers here
pm2 delete -s corelocation || :
pm2 start npm --name=corelocation -- run start

pm2 list

#pm2 log --lines 50 tripservice
#hold the process here
# pm2 logs