#!/bin/bash

cd $1

git pull > /dev/null 2>&1

echo "date,hash,files,lines"

while [ $? -eq 0 ]; do
    SHA=`git rev-parse HEAD`
    DATE=`git show -s --format=%ad --date=iso8601-strict`
    FILES=`find . -type f`
    if [ -z "$FILES" ]; then
        NUM_FILES=0
        NUM_LINES=0
    else
#      ERRORS=`printf $JSFILES | xargs jshint | sed '/^$/d' | wc -l`

       NUM_FILES=`printf '%b\n' $FILES | wc -l`
       NUM_LINES=`printf '%b\n' $FILES | xargs wc -l | grep -o "[0-9]\+ total" | cut -d ' ' -f 1`

    fi
    echo "$DATE,$SHA,$NUM_FILES,$NUM_LINES"
    git reset --hard "HEAD~" > /dev/null 2>&1
    # Note: for things like code quality measurement, skipping commits makes sense (HEAD~4) and is much faster
done
