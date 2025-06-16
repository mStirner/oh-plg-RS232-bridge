module.exports = (info, logger, init) => {
    return init([
        "devices"
    ], (scope, [
        C_DEVICES
    ]) => {


        // copied from https://github.com/lsongdev/wake-on-lan
        // https://github.com/lsongdev/wake-on-lan/blob/05144409171cc9aa5d314c95a8715110994d3a73/index.js#L10-L24
        function createMagicPacket(mac) {

            const MAC_REPEAT = 16;
            const MAC_LENGTH = 0x06;
            const PACKET_HEADER = 0x06;
            const parts = mac.match(/[0-9a-fA-F]{2}/g);

            if (!parts || parts.length != MAC_LENGTH) {
                throw new Error(`malformed MAC address "${mac}"`);
            }

            let buffer = Buffer.alloc(PACKET_HEADER);
            let bufMac = Buffer.from(parts.map(p => parseInt(p, 16)));

            buffer.fill(0xff);

            for (var i = 0; i < MAC_REPEAT; i++) {
                buffer = Buffer.concat([
                    buffer,
                    bufMac
                ]);
            }

            return buffer;

        };


        C_DEVICES.found({
            name: "Wake on LAN (WoL) Demo",
            labels: [
                "demo=true",
                "wol=enabled"
            ],
            interfaces: [{
                type: "ETHERNET",
                settings: {
                    host: "255.255.255.255",
                    port: 9,
                    socket: "udp",
                    mac: "AA:BB:CC:DD:EE:FF"   // CHANGE THIS!
                }
            }]
        }, (device) => {

            // feedback
            logger.info("Device found, create bridge & send WoL packet");

            // access broadcast interface 
            // deconstruct interface settings
            let interface = device.interfaces[0];
            let { host, port, socket, mac } = interface.settings;

            // tell connector to open a network socket
            let stream = interface.bridge();

            stream.once("error", (err) => {
                logger.error(err, "Could not bridge");
            });

            // wait for open bridge
            //stream.once("open", () => {

            // feedback
            logger.debug(`Bridge open to ${socket}://${host}:${port}`);

            // create magic package from mac
            let magicPacket = createMagicPacket(mac);

            stream.on("readable", () => {

                // read response
                // NOTE: this is not standard
                // devices do not respons to magick packets
                // if the connecector detects we send on port 9 & brodcast,
                // he echos back the sended data if the underayling network socket has writen thet data out
                let chunk = stream.read();

                console.log(chunk.length == magicPacket.length, chunk);

            });

            // write packet & listen for response
            stream.write(magicPacket);

            //});

        }, async (filter) => {

            // feedback
            logger.debug("No device found for given filter, add one", filter);

            // no device with filter above found
            // add one, so we can create a bridge to its interface
            let device = await C_DEVICES.add(filter);

            // fedback
            logger.info("Devcie added", device);

        });

    });
};