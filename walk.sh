#!/bin/bash

function escape {
  local s1=`echo "$1" | sed -e 's/"/\\"/'`
  echo \"$s1\"
}

cd $1

git pull > /dev/null 2>&1

echo "date,message,Number of files,Number of lines,Lines per file"

while [ $? -eq 0 ]; do
#    SHA=`git rev-parse HEAD`
    MESSAGE=`git log --format=%B -n 1 HEAD`
    DATE=`git show -s --format=%ad --date=iso8601`
    FILES=`find . -type f`
    if [ -z "$FILES" ]; then
        NUM_FILES=0
        NUM_LINES=0
    else
#      ERRORS=`printf $JSFILES | xargs jshint | sed '/^$/d' | wc -l`

       NUM_FILES=`printf '%b\n' $FILES | wc -l`
       NUM_LINES=`printf '%b\n' $FILES | xargs wc -l | grep -o "[0-9]\+ total" | cut -d ' ' -f 1`

    fi
    echo "$DATE,`escape "$MESSAGE"`,$NUM_FILES,$NUM_LINES,$(( NUM_LINES / NUM_FILES ))"
    git reset --hard "HEAD~" > /dev/null 2>&1
    # Note: for things like code quality measurement, skipping commits makes sense (HEAD~4) and is much faster
done

git reset --hard HEAD > /dev/null 2>&1