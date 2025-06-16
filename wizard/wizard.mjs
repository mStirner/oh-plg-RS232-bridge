import { execSync } from "node:child_process";
import { basename, join } from "node:path";
import { cwd, env } from "node:process";
import { rmSync, writeFileSync, readFileSync } from "node:fs";
import { EOL } from "node:os";
import inquirer from "inquirer";



if (env.SKIP_WIZARD) {
    process.exit(0);
}


const [
    delete_examples_folder,
    set_pkg_name,
    generate_uuid
] = await Promise.all([
    import("./commands/delete-examples-folder.mjs"),
    import("./commands/set-pkg-name.mjs"),
    import("./commands/generate-uuid.mjs"),
]).then((arr) => {
    return arr.map((obj) => {
        return obj.default;
    });
});

console.clear();

const questions = [{
    type: "confirm",
    name: "delete_examples_folder",
    message: "Delete examples folder",
    default: true
}, {
    type: "confirm",
    name: "set_pkg_name",
    message: `Set package.json name to "${basename(cwd())}"`,
    default: true
}, {
    type: "confirm",
    name: "generate_uuid",
    message: "Generate plugin UUID",
    default: true
}, {
    type: "confirm",
    name: "remove_setup_wizard",
    message: "Remove setup wizard",
    default: true
}, {
    type: "checkbox",
    name: "intents",
    message: "Component intents:",
    choices: [
        "devices", "endpoints", "mdns", "mqtt", "plugins",
        "rooms", "scenes", "ssdp", "store", "users", "vault",
        "webhooks"
    ].map((v) => {
        return {
            name: v,
            option: v
        };
    }),
    pageSize: 12
}, {
    type: "input",
    name: "author",
    message: "Enther Plugin Author name:",
    validate(input) {
        if (input.trim() === "") {
            return "Name cannot be empty!";
        }
        return true;
    },
}];

inquirer.prompt(questions).then((answers) => {

    let uuid = null;

    if (answers.delete_examples_folder) {
        delete_examples_folder();
    }

    if (answers.set_pkg_name) {
        set_pkg_name();
    }

    if (answers.generate_uuid) {
        uuid = generate_uuid();
        console.log(`UUID = ${uuid}`);
    }

    if (answers.remove_setup_wizard) {

        execSync("npm config delete scripts.postinstall");
        execSync("npm uninstall inquirer");

        rmSync(join(cwd(), "wizard"), {
            recursive: true,
            force: true
        });

    }

    let pkg = JSON.parse(readFileSync("./package.json"));
    pkg.author = answers.author;
    delete pkg.scripts?.postinstall; // fix #22

    writeFileSync(join(cwd(), "package.json"), `${JSON.stringify(pkg, null, 2)}${EOL}`, {
        encoding: "utf8"
    });

    writeFileSync(join(cwd(), "metadata.json"), `${JSON.stringify({
        name: pkg.name,
        version: pkg.version,
        intents: answers.intents,
        author: pkg.author || "",
        website: pkg.webiste || "",
        description: pkg.description || "",
        uuid
    }, null, 2)}${EOL}`, {
        encoding: "utf8"
    });

}).catch((err) => {
    if (err.isTtyError) {

        console.error(err);

    } else {

        console.error(err);
        process.exit(3);

    }
});