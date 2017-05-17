# Shell script to start the database and app services before running the tests.

## color codes
RED='\033[1;31m'
GREEN='\033[1;32m'
CYAN='\033[1;36m'
PLAIN='\033[0m'

## cleaning up previous builds
echo "\n${RED}Finding old builds and cleaning up${PLAIN} ${GREEN}...${PLAIN}"
docker rm -vf cloudant-testdb
echo "${CYAN}Clean up complete.${PLAIN}\n"

## put up the database service
echo "${RED}Starting the database service${PLAIN} ${GREEN}...${PLAIN}"
docker run -d -p 8080:80 --privileged --name cloudant-testdb ibmcom/cloudant-developer:1.0.1
echo "${CYAN}Database service started.${PLAIN}\n"

## (Cloudant only) Accept Cloudant license
echo "${RED}Accept Cloudant license${PLAIN} ${GREEN}...${PLAIN}"
docker exec -it cloudant-testdb cast license --silent

## (Cloudant only) Initialize data volume
## password has to be `pass` in order for it to work
echo "${RED}Initialize Cloudant Data Volume${PLAIN} ${GREEN}...${PLAIN}"
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
    echo "\n${RED}Failed to start Cloudant service. Terminating setup.${PLAIN}\n"
    exit 1
else
    echo "\n${CYAN}Cloudant started.${PLAIN}\n"

    ## create database --- TODO check return code 
    echo "\n${CYAN}Creating database in Cloudant${PLAIN}\n"
    curl --request PUT --url http://admin:pass@0.0.0.0:8080/test-db
fi

