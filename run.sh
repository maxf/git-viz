#!/bin/bash
NAME=`echo $1 | sed -e 's|.*/\([^/]*\)\.git|\1|g'`
echo $NAME
mkdir -p repo
cd repo

echo "Cloning repo"
git clone $1
cd $NAME

echo "Extracting commit log"
git log --no-merges --pretty=format:'%h|%cd|%s' > ../log.txt

