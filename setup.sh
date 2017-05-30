#!/bin/bash		
 		
 # Shell script to start the database and app services before running the tests.		
 		
 ## color codes		
 RED='\033[1;31m'		
 GREEN='\033[1;32m'		
 YELLOW='\033[1;33m'		
 CYAN='\033[1;36m'		
 PLAIN='\033[0m'		
 		
 ## variables		
 HOST=localhost		
 USER='admin'		
 PASSWORD='pass'		
 PORT=8080		
 DATABASE='testdb'		
 if [ "$1" ]; then		
     HOST=$1		
 fi		
 if [ "$2" ]; then		
     PORT=$2		
 fi		
 if [ "$2" ]; then		
     USER=$3		
 fi		
 if [ "$4" ]; then		
     PASSWORD=$4		
 fi		
 if [ "$5" ]; then		
     DATABASE=$5		
 fi		
 		
 ## check if docker exists		
 printf "\n${RED}>> Checking for docker${PLAIN} ${GREEN}...${PLAIN}"		
 docker -v > /dev/null 2>&1
 DOCKER_EXISTS=$?
 if [ "$DOCKER_EXISTS" -ne 0 ]; then		
     printf "\n\n${CYAN}Status: ${PLAIN}${RED}Docker not found. Terminating setup.${PLAIN}\n\n"		
     exit 1		
 fi	
 printf "\n${CYAN}Found docker. Moving on with the setup.${PLAIN}\n"

 ## check if docker-compose exists		
 printf "\n${RED}>> Checking for docker-compose${PLAIN} ${GREEN}...${PLAIN}"		
 docker-compose -v > /dev/null 2>&1
 DOCKER_COMPOSE_EXISTS=$?
 if [ "$DOCKER_COMPOSE_EXISTS" -ne 0 ]; then		
     printf "\n\n${CYAN}Status: ${PLAIN}${RED}Docker compose not found. Terminating setup.${PLAIN}\n\n"		
     exit 1		
 fi
 printf "\n${CYAN}Found docker-compose. Moving on with the setup.${PLAIN}\n"
 		
 ## cleaning up previous builds		
 printf "\n${RED}>> Finding old builds and cleaning up${PLAIN} ${GREEN}...${PLAIN}"		
 docker-compose down > /dev/null 2>&1		
 printf "\n${CYAN}Clean up complete.${PLAIN}\n"		
 		
 ## put up the database service		
 printf "\n${RED}>> Starting the database service${PLAIN} ${GREEN}...${PLAIN}"		
 docker-compose up -d cloudant > /dev/null 2>&1		
 printf "\n${CYAN}Database service started.${PLAIN}\n"		
 		
 ## (Cloudant only) Accept Cloudant license		
 printf "\n${RED}>> Accepting license${PLAIN} ${GREEN}...${PLAIN}"		
 docker exec -it cloudant-testdb cast license --silent > /dev/null 2>&1	
 LICENSE_OUTPUT=$?		
 if [ "$LICENSE_OUTPUT" -ne 0 ]; then		
     printf "\n\n${CYAN}Status: ${PLAIN}${RED}Failed to accept license. Terminating setup.${PLAIN}\n\n"		
     exit 1		
 fi		
 printf "\n${CYAN}License accepted.${PLAIN}\n"		
 		
 ## (Cloudant only) Initialize data volume		
 ## password has to be `pass` in order for it to work		
 printf "\n${RED}>> Initialize data volume${PLAIN} ${GREEN}...${PLAIN}"		
 docker exec cloudant-testdb cast database init -v -y -p pass > /dev/null 2>&1		
 printf "\n${CYAN}Data volume initialized.${PLAIN}\n"		
 		
 ## Create database		
 OUTPUT=$?		
 TIMEOUT=120		
 TIME_PASSED=0		
 WAIT_STRING="."		
 		
 printf "\n${GREEN}Waiting for cloudant service to be up $WAIT_STRING${PLAIN}"		
 while [ "$OUTPUT" -ne 200 ] && [ "$TIMEOUT" -gt 0 ]		
     do		
         OUTPUT=$(curl -s -o /dev/null -w "%{http_code}" --request GET --url http://$USER:$PASSWORD@$HOST:$PORT/_all_dbs)		
         sleep 1s		
         TIMEOUT=$((TIMEOUT - 1))		
         TIME_PASSED=$((TIME_PASSED + 1))		
 		
         if [ "$TIME_PASSED" -eq 5 ]; then		
             printf "${GREEN}.${PLAIN}"		
            TIME_PASSED=0		
         fi		
    done		
		
if [ "$TIMEOUT" -le 0 ]; then		
    printf "\n\n${CYAN}Status: ${PLAIN}${RED}Failed to start Cloudant service. Terminating setup.${PLAIN}\n\n"		
    exit 1		
fi		
printf "\n${CYAN}Cloudant started.${PLAIN}\n"		

## create database		
printf "\n${RED}>> Creating database in Cloudant${PLAIN}"		
curl --request PUT --url http://$USER:$PASSWORD@$HOST:$PORT/$DATABASE > /dev/null 2>&1		
DB_OUTPUT=$?		
if [ "$DB_OUTPUT" -ne 0 ]; then		
    printf "\n\n${CYAN}Status: ${PLAIN}${RED}Database could not be created. Terminating setup.${PLAIN}\n\n"		
    exit 1		
fi		
printf "\n${CYAN}Database created succesfully.${PLAIN}\n"		

 ## set env variables for running test		
 printf "\n${RED}>> Setting env variables to run test${PLAIN} ${GREEN}...${PLAIN}"		
 export CLOUDANT_URL=http://$USER:$PASSWORD@$HOST:$PORT		
 export CLOUDANT_USERNAME=$USER		
 export CLOUDANT_PASSWORD=$PASSWORD		
 export CLOUDANT_PORT=$PORT		
 export CLOUDANT_DATABASE=$DATABASE		
 export CI=true		
 printf "\n${CYAN}Env variables set.${PLAIN}\n"		
 		
 printf "\n${CYAN}Status: ${PLAIN}${GREEN}Set up completed successfully.${PLAIN}\n"		
 printf "\n${CYAN}Instance url: ${YELLOW}http://$USER:$PASSWORD@$HOST:$PORT/$DATABASE${PLAIN}\n"		
 printf "\n${CYAN}To run the test suite:${PLAIN} ${YELLOW}npm run mocha${PLAIN}\n\n"
