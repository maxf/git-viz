#!/bin/bash
HERE=$PWD
cd $1

echo "Extracting commit log"
git log --no-merges --date=iso8601-strict --pretty=format:'%h|%cd|%s' > $HERE/log.txt

