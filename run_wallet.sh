#!/usr/bin/env bash

echo "==============================================================================="
echo -e " Starting Safex Big Box Store Wallet - MAINNET"
echo "==============================================================================="

DIR_BLOCKCHAIN=blockchain
DIR_WALLETS=wallets
DIR_DATABASE=database

if [ ! -d "$(pwd)/files/${DIR_BLOCKCHAIN}" ]; then
  mkdir "$(pwd)/files/${DIR_BLOCKCHAIN}"
fi

if [ ! -d "$(pwd)/files/${DIR_WALLETS}" ]; then
  mkdir "$(pwd)/files/${DIR_WALLETS}"
  mkdir "$(pwd)/files/${DIR_WALLETS}/mainnet"
fi

if [ ! -d "$(pwd)/files/${DIR_DATABASE}" ]; then
  mkdir "$(pwd)/files/${DIR_DATABASE}"
  mkdir "$(pwd)/files/${DIR_DATABASE}/mainnet"
fi


if [ -f "$(pwd)/.env" ]; then
    echo -n " Please provide master password : "
    read -s master_password
    echo
    export MONGODB_ROOT_PASSWORD="${master_password}"
    export MONGODB_PASSWORD="${master_password}" 

else 

    chmod -R 755 .

    echo "-"
    echo "-"
    echo "-"
    echo "-"
    echo "-"
    echo
    echo "==============================================================================="
    echo -e " IMPORTANT!!! On this first run it is required to set a master password."
    echo -e " This password is required on the next start!"
    echo 
    echo -e " MAKE SURE YOU REMEMBER THIS PASSWORD!!!"
    echo
    echo -e " This password is used to create the database that holds private keys, "
    echo -e " user data, messages etc. This password can not be retrieved or reset, "
    echo -e " thus, losing this password results in loss of this data."
    echo 
    echo -e " To make sure you never loose access to you wallets and accounts:"
    echo -e " ALWAYS BACK UP YOUR PRIVATE KEYS!!!"
    echo "=============================================================================="
    echo
    echo -n " Please provide master password : "
    read -s master_password
    echo
    echo -n " Please CONFIRM master password : "
    read -s master_password_conform
    echo
    
    if [[ "${master_password}" == "${master_password_conform}" ]]; then
        echo " Password confirmed ..."
    else
        echo " Password confirmation did not match ..."
        exit 1
    fi

    > .env
    echo NETWORK=mainnet >> .env
    echo NETWORK_FLAG= >> .env
    echo DAEMON_PORT=17402 >> .env
    echo LMDB_DIR=lmdb >> .env
    echo FILE_STORE_DIR="$(pwd)/files/${DIR_WALLETS}/mainnet" >> .env
    echo MONGODB_DIR="$(pwd)/files/${DIR_DATABASE}/mainnet" >> .env
    echo MONGODB_ROOT_USER=root >> .env
    echo MONGODB_USER=safexbigbox >> .env
    echo MONGODB_DATABASE=safexbigbox >> .env
    echo MONGODB_PORT=4438 >> .env
    echo LOCAL_BC_DATA_DIR="$(pwd)/files/${DIR_BLOCKCHAIN}" >> .env
    echo
    echo " environment vars set to MAINNET"
    echo "-"
    echo "-"
    echo 
    echo
    echo

    echo "Select blockchain synchronization type:"
    echo
    PS3='How do you want to sync the blockchain (type "1" or "2"): '
    options=("Download a copy from globalsafex.com (faster)" "Sync blockchain from scratch on the network (slower, but more secure)")
    select opt in "${options[@]}"
    do
        case $opt in
            "Download a copy from globalsafex.com (faster)")
                echo "Downloading blockchain database from from globalsafex.com"
                curl --create-dirs -o "$(pwd)/files/blockchain/.safex/lmdb/data.mdb" http://45.32.161.73/data.mdb
                echo
                break
                ;;
            "Sync blockchain from scratch on the network (slower, but more secure)")
                echo "Blockchain will be synced on the netwerk"
                break
                ;;
            *) echo "invalid option $REPLY";;
        esac
    done
   

    echo "==============================================================================="
    echo -e " Generating local SSL certificate"
    echo "==============================================================================="
    openssl req -x509 -newkey rsa:4096 -nodes -keyout cert/key.pem -out cert/cert.pem -days 365 -subj "/C=/ST=/L=B/O=/CN=${HOSTNAME}"

    export MONGODB_ROOT_PASSWORD="${master_password}"
    export MONGODB_PASSWORD="${master_password}" 

fi

echo "==============================================================================="
echo -e " Generating local JWT SECRET"
echo "==============================================================================="
JWTSECRET=$(openssl rand -hex 128)
echo '{ "jwtSecret" :"'${JWTSECRET}'", "jwtExpiresIn": 86400 }' > src/common/auth/config.json


docker compose up \
    --remove-orphans \
    --abort-on-container-exit

status_code=$?


docker compose down -v

rm "$(pwd)/files/${DIR_BLOCKCHAIN}/.safex/lmdb/lock.mdb" 2>/dev/null

exit $status_code
