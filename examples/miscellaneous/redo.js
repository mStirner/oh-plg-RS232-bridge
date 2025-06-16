const infinity = require("../../helper/infinity.js");
const debounce = require("../../helper/debounce.js");

module.exports = (info, logger, init) => {
    return init([], (scope, []) => {

        // debounce calls to redo method
        // let infinity wrapper inject the redo method
        let worker = debounce((redo) => {

            console.log("Start working...");

            // simulate some blocking work
            for (let i = 0; 5 >= i; i++) {
                console.log(`i = ${i}`);
            }

            // first call
            // e.g error event listener
            redo();

            // second call
            // e.g. work "done", because error
            setTimeout(redo, 200);


        }, 1000);

        // inject "redo" method into debounce call
        // all calls to "redo" are debounced by 1s
        infinity(worker);


    });
};

