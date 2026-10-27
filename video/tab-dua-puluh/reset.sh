#!/bin/bash
S=/tmp/claude-0/-home-user/c3dc5e70-a599-57ff-91be-f3087c292010/scratchpad
cd /home/user/mpruy/apps/pocketbase
pkill -x pocketbase; sleep 1
rm -rf $S/vid_pb
./pocketbase migrate up --dir=$S/vid_pb --migrationsDir=./pb_migrations --hooksDir=./pb_hooks >/dev/null 2>&1
./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir=$S/vid_pb --migrationsDir=./pb_migrations >/dev/null 2>&1
(MEDCOEL_DEV_MODE=1 nohup ./pocketbase serve --http=127.0.0.1:8090 --dir=$S/vid_pb --migrationsDir=./pb_migrations --hooksDir=./pb_hooks > $S/pb_serve.log 2>&1 &)
for i in $(seq 1 20); do curl -s localhost:8090/api/health >/dev/null && break; sleep 1; done
cd $S/video/seed && node seed.mjs 2>&1 | tail -2
