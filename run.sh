#!/bin/bash
cd $1

git pull > /dev/null

git log --date=iso8601 --pretty=format:'%h|%cd|%s'

