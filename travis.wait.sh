#!/bin/sh
while ! curl -s 0:0:0:0:0:0:0:0:4201/api/swagger/ >/dev/null; do
    sleep 1
done