# Shell script to start the database and app services before running the tests.

## color codes
RED='\033[1;31m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
PLAIN='\033[0m'

## variables
USER='admin'
PASSWORD='pass'
PORT=8080
DATABASE='test'

## check if docker exists
printf "\n${RED}>> Checking for docker${PLAIN} ${GREEN}...${PLAIN}"
docker -v > /dev/null 2>&1
DOCKER_EXISTS=$?
if [ "$DOCKER_EXISTS" -ne 0 ]; then
    printf "\n${CYAN}Status: ${PLAIN}${RED}Docker not found. Terminating setup.${PLAIN}\n"
    exit 1
fi
printf "\n${CYAN}Found docker. Moving on with the setup.${PLAIN}\n"

## cleaning up previous builds
printf "\n${RED}>> Finding old builds and cleaning up${PLAIN} ${GREEN}...${PLAIN}"
docker-compose down > /dev/null 2>&1
printf "\n${CYAN}Clean up complete.${PLAIN}\n"

## put up the database service
printf "\n${RED}>> Starting the database service${PLAIN} ${GREEN}...${PLAIN}"
docker-compose up -d cloudant > /dev/null 2>&1
printf "\n${CYAN}Database service started.${PLAIN}\n"

## (Cloudant only) Accept Cloudant license
printf "\n${RED}>> Accept Cloudant license${PLAIN} ${GREEN}...${PLAIN}\n"
docker exec -it cloudant-testdb cast license --silent

## (Cloudant only) Initialize data volume
## password has to be `pass` in order for it to work
printf "\n${RED}>> Initialize Cloudant Data Volume${PLAIN} ${GREEN}...${PLAIN}\n"
docker exec cloudant-testdb cast database init -v -y -p pass

## Create database
OUTPUT=$?
TIMEOUT=120
TIME_PASSED=0
WAIT_STRING="."

printf "\n${GREEN}Waiting for cloudant service to be up $WAIT_STRING${PLAIN}"
while [ "$OUTPUT" -ne 200 ] && [ "$TIMEOUT" -gt 0 ]
    do
        OUTPUT=$(curl -s -o /dev/null -w "%{http_code}" --request GET --url http://admin:pass@0.0.0.0:8080/_all_dbs)
        sleep 1s
        TIMEOUT=$((TIMEOUT - 1))
        TIME_PASSED=$((TIME_PASSED + 1))

        if [ "$TIME_PASSED" -eq 5 ]; then
            printf "${GREEN}.${PLAIN}"
            TIME_PASSED=0
        fi
    done

if [ "$TIMEOUT" -le 0 ]; then
    printf "\n${RED}Failed to start Cloudant service. Terminating setup.${PLAIN}\n"
    exit 1
else
    printf "\n${CYAN}Cloudant started.${PLAIN}\n"

    ## create database --- TODO check return code 
    printf "\n${CYAN}Creating database in Cloudant${PLAIN}\n"
    curl --request PUT --url http://admin:pass@0.0.0.0:8080/test-db

     ## setting env variables
    printf "\n${CYAN}Setting env variables to run test${PLAIN}\n"
    export CLOUDANT_URL=http://admin:pass@0.0.0.0:8080/
    export CLOUDANT_USERNAME=$USER
    export CLOUDANT_PASSWORD=$PASSWORD
    export CLOUDANT_PORT=$PORT
    export CLOUDANT_DATABASE=$DATABASE
fi

