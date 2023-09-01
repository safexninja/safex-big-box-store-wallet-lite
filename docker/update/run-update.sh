cd /home/docker/update
sudo rm -R docker
sudo rm -R explorer
sudo rm -R nginx
sudo rm -R src
sudo rm -R docs
sudo rm *.yml
sudo rm *.json
sudo rm *.md
sudo rm *.js
sudo rm *.sh
cd /home/docker/git
sudo git clone https://github.com/safexninja/safex-big-box-store-wallet.git
sudo rsync -av --exclude='cert' --exclude='files' --exclude='files' --exclude='.git' -exclude='.gitignore' safex-big-box-store-wallet/ /home/docker/update

