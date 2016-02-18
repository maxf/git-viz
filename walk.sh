#!/bin/bash

cd $1

git pull > /dev/null 2>&1

while [ $? -eq 0 ]; do
    SHA=`git rev-parse HEAD`
    DATE=`git show -s --format=%ad --date=iso8601-strict`
    ERRORS=`find . -name \*.js | xargs jshint | sed '/^$/d' | wc -l`
    LINES=`find . -name \*.js | xargs wc -l|grep -o "[0-9]\+ total"|cut -d ' ' -f 1`
    echo "$DATE / $SHA / $ERRORS / $LINES"
    git reset --hard "HEAD~" > /dev/null 2>&1
    # Note: for things like code quality measurement, skipping commits makes sense (HEAD~4) is is much faster
done
