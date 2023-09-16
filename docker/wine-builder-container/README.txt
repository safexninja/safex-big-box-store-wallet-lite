
USAGE
##################

1) Build image:
-----------------
docker build -t safexninja-wine-builder .



2) Run container from project root:
-----------------

sudo docker run -ti  --env ELECTRON_CACHE="/home/docker/.cache/electron"  --env ELECTRON_BUILDER_CACHE="/home/docker/.cache/electron-builder"  -v ${PWD}:/project:rw  -v ${PWD}/node_modules_wine:/project/node_modules:rw  -v ~/.cache/electron:/home/docker/.cache/electron  -v ~/.cache/electron-builder:/home/docker/.cache/electron-builder safexninja-wine-builder


sudo docker run -ti  --env ELECTRON_CACHE="/home/docker/.cache/electron"  --env ELECTRON_BUILDER_CACHE="/home/docker/.cache/electron-builder"  -v ${PWD}:/project:rw  -v ${PWD}/node_modules_dos:/project/node_modules:rw  -v ~/.cache/electron:/home/docker/.cache/electron  -v ~/.cache/electron-builder:/home/docker/.cache/electron-builder safexninja-wine-builder



https://github.com/WiseLibs/better-sqlite3/issues/704
