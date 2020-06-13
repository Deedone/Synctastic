#!/bin/bash

NAME=synctastic.zip
rm $NAME

RED='\033[0;31m'
NC='\033[0m' # No Color
if grep "//const URL = \"wss://synctastic.herokuapp.com/\";" extension/background.ts
then
echo -e "${RED} Warning, probably wrong server URL. Please check. ${NC}"
fi


echo BUIDING EXTENSION
mkdir build
bash -c "cd extension; npx webpack"
bash -c "cd extension/popup;npx webpack"

cp extension build -r

rm build/extension/node_modules -rf
rm build/extension/*.ts -rf
rm build/extension/README.md -rf
rm build/extension/popup/node_modules -rf
rm build/extension/popup/src -rf
rm build/extension/popup/README.md -rf
rm build/extension/package.json
rm build/extension/package-lock.json
rm build/extension/tsconfig.json

cd build/extension
zip -r -FS $NAME *
cd ../..
cp build/extension/$NAME .
rm build -rf