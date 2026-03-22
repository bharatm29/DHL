import fs from "fs/promises";
import fsync from "fs";
import path from "path";
import {parse} from "papaparse";

export const readFile = (filename: string): string => {
    const cmdfilePath = path.join(
        process.cwd(),
        `app/_lib/dhl/${filename}`
    );

    return fsync.readFileSync(cmdfilePath, "utf-8");
};

export function getCountries() {
    return new Map(JSON.parse(readFile("Zones.json")));
}

const DHL_PATH = "app/_lib/dhl";
const jsons = ["doc.json", "non-doc.json", "multiplier.json"]

function ifExists(path: string): boolean {
    for (const json in jsons) {
        if (!fsync.existsSync(`${path}/${json}`)) return false;
    }

    return true;
}

async function parseZones(filename: string) {
    const filePath = path.join(
        process.cwd(),
        filename
    );

    const file = await fs.readFile(filePath, "utf-8");

    const zones = new Map();

    parse(file, {
        skipFirstNLines: 1,
        header: false,
        complete: function (results) {
            results.data.forEach((record) => {
                for (let i = 0; i < record.length; i += 3) {
                    let name = record[i];
                    if (!name) continue;

                    let code = record[i + 1].trim();
                    let zone = record[i + 2].trim();
                    zones.set(name.trim(), {code, zone});
                }
            });
        },
    });

    await fs.writeFile(`${DHL_PATH}/Zones.json`, JSON.stringify(Array.from(zones.entries())));
}

// Maybe move then locally
const doc = new Map();
const nondoc = new Map();
const multiplierWeights = [];

// Populates maps and arrays with csv data
async function parseCSV(filename) {
    const filePath = path.join(
        process.cwd(),
        filename
    );

    const file = await fs.readFile(filePath, "utf-8");

    parse(file, {
        header: false,
        complete: function (results) {
            // FIXME: maybe move them out?
            const DOC_LENGTH = 4;
            const NON_DOC_LENGTH = 50;
            const MULTIPLIER_LENGTH = 6;

            for (let i = 0; i < DOC_LENGTH; i++) {
                const record = results.data[i + 1];
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    mapping.set(j.toString(), record[j].trim());
                }
                doc.set(record[0].trim(), mapping);
            }

            for (let i = 0; i < NON_DOC_LENGTH; i++) {
                const record = results.data[i + (DOC_LENGTH + 1) + 1]; // 2 for headers (0-based index so only +1)
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    mapping.set(j.toString(), record[j].trim());
                }
                nondoc.set(record[0].trim(), mapping);
            }

            for (let i = 0; i < MULTIPLIER_LENGTH; i++) {
                const record = results.data[i + (DOC_LENGTH + NON_DOC_LENGTH + 2) + 1];
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    mapping.set(j.toString(), record[j].trim());
                }
                nondoc.set(record[0].trim(), mapping);
                multiplierWeights.push(parseFloat(record[0].trim()));
            }
        },
    });
}

function serializeMap(map) {
    return JSON.stringify(map, (key, value) => {
        if (value instanceof Map) {
            return {
                __type: "Map",
                value: Array.from(value.entries()),
            };
        }
        return value;
    });
}

export async function prepareDHL(filename: string): Promise<void> {
    // FIXME: skipping for now, but check for Zones.json too
    if (!fsync.existsSync(`${DHL_PATH}/Zones.json`)) {
        await parseZones(`${DHL_PATH}/Zonal2026.csv`);
    }

    const path = `app/_lib/dhl/${filename}`;
    if (ifExists(path)) return;

    // do the parsing for the said file
    await parseCSV(`${path}.csv`)

    // write to corresponding files
    await fs.mkdir(path, {recursive: true});
    await fs.writeFile(`${path}/doc.json`, serializeMap(doc));
    await fs.writeFile(`${path}/non-doc.json`, serializeMap(nondoc));
    await fs.writeFile(`${path}/multiplier.json`, JSON.stringify(multiplierWeights));

    return; // dun
}
