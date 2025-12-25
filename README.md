# Introduction
This plugin connect to a Serial device (RS232/RS485) exposed over [`socat`](https://linux.die.net/man/1/socat), and sends command payloads to it.<br />
For configuration, see "[Configuration](#Configuration)" sectio below.

If sends every payload defined in the `.payload` property on the endpoint command, but expects the device to end its response with `\r\n` or `\r` or `\n`.
Maybe this can be confiugred in further version, but currently i use it to control my [Aten VS0801H HDMI switcher](https://www.aten.com/de/de/products/professionelles-audiovideo/grafik-switches/vs0801h/).

More features like byte counter, configurable line end, etc. pp. could be implemented.<br />
Feel free to open a issue if you need a feature or support: https://github.com/mStirner/oh-plg-RS232-bridge/issues

# Configuration
#### Create a system unit file:

`/etc/systemd/system/socat-<your device>`:
```systemd
[Unit]
Description=Socat Serial to TCP bridge
After=network.target dev-ttyUSB0.device
Requires=dev-ttyUSB0.device

[Service]
ExecStart=/usr/bin/socat TCP-LISTEN:4161,fork /dev/ttyUSB0,raw,echo=0,b19200
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Replace `ttyUSB0` with your real serial device.<br />
> [!NOTE]
> Dont forget to set the right baud rate, stop & data bits, etc.
> 

#### Enable & start the service:
```sh
systemctl daemon-reload
systemctl enable --now socat-ttyUSB0
```

#### Quick Test
```sh
echo -ne "<payload>" | nc -q 1 <host> 4161
#echo -ne "sw i05\r\n" | nc -q 1 192.168.2.145 4161
```

### Add device & endpoint into OpenHaus:
Create a device & endpoint item, with the following labels:
```json
{
   "labels": [
      "type=serial",
      "bridge=true",
      "mode=rs232"
   ]
}
```

Ensure that a **ETHERNET** interface exists on the device item with the correct settings from socat above:
```json
{
  "type": "ETHERNET",
  "settings": {
    "socket": "tcp",
    "host": "127.5.5.1",
    "port": 4161
  }
}
```

All commands on the endpoint, needs to be configured to use the **ETHERNET** interface, which leads to the socat bridge.<br />
Otherwise a error is shown: _"Multiple interface IDs in commands array deteced"_.<br />
ETHERNET & non-ETHERNET commands cannot be mixed!

# Installation
1) Create a new plugin over the OpenHaus backend HTTP API
2) Mount the plugin source code folder into the backend
3) run `npm install`

# Development
Add plugin item via HTTP API:<br />
[PUT] `http://{{HOST}}:{{PORT}}/api/plugins/`
```json
{
   "name":"oh-plg-rs232-bridge",
   "version": "0.1.0",
   "intents":[
      "devices",
      "endpoints"
   ],
   "uuid": "38708ff1-5fc0-4723-8fe9-64e4695705ed"
}
```

Mount the source code into the backend plugins folder
```sh
sudo mount --bind ~/projects/OpenHaus/plugins/oh-plg-RS232-bridge/ ~/projects/OpenHaus/backend/plugins/38708ff1-5fc0-4723-8fe9-64e4695705ed/
```