#!/bin/bash
NAME=`echo $1 | sed -e 's|.*/\([^/]*\)\.git|\1|g'`
echo $NAME
mkdir -p repo
cd repo
git clone $1
cd $NAME

git log --no-merges --pretty=format:'%h|%ad|%s' > ../log.txt

