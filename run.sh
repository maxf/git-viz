#!/bin/bash
cd $1

git pull

git log --no-merges --date=iso8601-strict --pretty=format:'%h|%cd|%s'

