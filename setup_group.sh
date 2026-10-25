#!/usr/bin/env sh

sudo groupadd -f hid
sudo usermod -aG hid oliver
echo 'KERNEL=="hidg[0-9]*", GROUP="hid", MODE="0660"' | sudo tee /etc/udev/rules.d/99-hidg.rules
sudo udevadm control --reload-rules
sudo udevadm trigger
