module.exports = (info, logger, init) => {
    return init([
        "devices",
        "endpoints"
    ], (scope, [
        C_DEVICES,
        C_ENDPOINTS
    ]) => {

        C_DEVICES.found({
            labels: [
                "type=serial",
                "bridge=true",
                "mode=rs232"
            ]
        }, (device) => {

            logger.info(`Device ${device.name} discovered!`, device);

            C_ENDPOINTS.found({
                labels: [
                    //`device=${device._id}`,
                    ...device.labels
                ]
            }, (endpoint) => {
                try {

                    let id = endpoint.commands.reduce((id, cmd) => {

                        if (id !== cmd.interface) {

                            let msg = "Multiple interface IDs in commands array deteced\r\n";
                            msg += `Expected ${id} got ${cmd.interface}`;

                            throw new Error(msg);

                        }

                        return cmd.interface;

                    }, endpoint.commands[0]?.interface);

                    let iface = device.interfaces.find((iface) => {
                        return iface._id === id;
                    });

                    if (!iface) {
                        throw new Error(`Device interface "${id}" not found`);
                    }

                    endpoint.commands.forEach((cmd) => {
                        cmd.setHandler((_, done) => {

                            logger.verbose(`Handle command ${cmd.name}`, cmd);

                            let { host, port } = iface.settings;
                            let stream = iface.bridge();
                            let timeout = null;

                            stream.once("open", () => {

                                logger.verbose(`Connected to tcp://${host}:${port}`);

                                stream.write(cmd.payload, (err) => {
                                    if (err) {

                                        done(err);

                                    } else {

                                        let chunks = [];

                                        stream.on("data", (chunk) => {

                                            chunks.push(chunk);

                                            const buf = Buffer.concat(chunks)
                                            const crlf = Buffer.from("0d0a", "hex");

                                            if (buf.length >= crlf.length && buf.subarray(buf.length - crlf.length).equals(crlf)) {
                                                stream.end();
                                                //stream.emit("end");
                                            }

                                            /*

                                            let str = Buffer.concat(chunks).toString();

                                            console.log("String:", str)

                                            let end = [
                                                str.endsWith('\r\n'),
                                                str.endsWith('\r'),
                                                str.endsWith('\n')
                                            ].some((v) => { return v });
                                            

                                            if (end) {
                                                stream.end();
                                            }
                                            */

                                        });

                                        ["end", "close"].forEach((event) => {
                                            stream.once(event, () => {

                                                let buff = Buffer.concat(chunks)
                                                let str = buff.toString();

                                                let success = [
                                                    Buffer.compare(buff, Buffer.isBuffer(cmd.payload) ? cmd.payload : Buffer.from(cmd.payload)) === 0,
                                                    str.toLowerCase() === "ok",
                                                    str === "1",
                                                    str === "true",
                                                    str === cmd.payload?.toString(),
                                                    new RegExp(/ok/gim).test(str)
                                                ].some((value) => { return value });

                                                done(null, success ?? null);
                                                clearTimeout(timeout);

                                            });
                                        });

                                    }
                                });

                            });

                            stream.once("close", () => {
                                logger.debug(`Disconnected from tcp://${host}:${port}`);
                            });

                            stream.once("error", (err) => {

                                logger.warn(err, "Could not connect/send command payload");
                                done(err)

                            });

                            setTimeout(() => {
                                stream.end();
                            }, 2000);

                        });
                    });


                } catch (err) {

                    logger.warn(err, `Could not setup command handling for endponit "${endpoint.name}" (${endpoint._id})`);

                }
            }, (filter) => {

                let msg = `No serial endpoint found for device "${device.name}" (${device._id})\r\n`;
                msg += `Add a endpoint with labels ${filter.labels}.\r\n`;
                msg += "See documentation on https://github.com/mStirner/oh-plg-RS232-bridge for detailed configuration.";

                logger.info(msg);

                /*
                let commands = Array.from({ length: 8 }).fill(null).map((v, i) => {
                    return {
                        name: `Input #${i + 1}`,
                        payload: Buffer.from(`sw i0${i + 1}\r\n`),
                        alias: `INPUT_${i + 1}`,
                        interface: "685044266b1dc7e48748b500"
                    }
                });
            
                console.log(JSON.stringify(commands))
                */


            });

        }, (filter) => {

            let msg = "No serial device found\r\n";
            msg += `Add manuell a device with labels ${filter.labels}.\r\n`;
            msg += "See documentation on https://github.com/mStirner/oh-plg-RS232-bridge for detailed configuration.";

            logger.info(msg);

        });


    });
};