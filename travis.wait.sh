#!/bin/sh
while ! curl -s localhost:4201/api/swagger/ >/dev/null; do
    sleep 1
done