#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

cd "$DIR"

function go {
    echo "Setting up GO watch"
    bash -c "ls *.go | entr -s \"echo 'rebuild go';go build\""&
echo "Hit enter to rescan all projects"
}


function ts {
    echo "Setting up TS watch"
    bash -c "cd extension; ls *.ts | entr -s \"echo 'rebuild ts';npx webpack\""&
echo "Hit enter to rescan all projects"
}


function vue { 
echo "Setting up VUE watch"
bash -c "cd extension/popup; find src | entr -s \"echo 'rebuild vues';npx webpack \""&
echo "Hit enter to rescan all projects"
}

while true
do
go
ts
vue
jobs
read
jobs
kill $(jobs -p)
done