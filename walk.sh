#!/bin/bash

cd $1

git pull > /dev/null 2>&1

echo "date,hash,lines,errors"

while [ $? -eq 0 ]; do
    SHA=`git rev-parse HEAD`
    DATE=`git show -s --format=%ad --date=iso8601-strict`
    JSFILES=`find . -type f -name \*.js`
    if [ -z "$JSFILES" ]; then
      ERRORS=0
      LINES=0
    else
      ERRORS=`echo $JSFILES | xargs jshint | sed '/^$/d' | wc -l`
      LINES=`echo $JSFILES | xargs wc -l|grep -o "[0-9]\+ total"|cut -d ' ' -f 1`
    fi
    echo "$DATE,$SHA,$LINES,$ERRORS"
    git reset --hard "HEAD~" > /dev/null 2>&1
    # Note: for things like code quality measurement, skipping commits makes sense (HEAD~4) and is much faster
done
