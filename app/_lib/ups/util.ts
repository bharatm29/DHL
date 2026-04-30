import fs from "fs/promises";
import fsync from "fs";
import path from "path";
import {parse} from "papaparse";

const ROOT = process.cwd();
const UPS_DIR = path.join(ROOT, 'app', '_lib', 'ups');

export const readFile = (filename: string): string => {
    const cmdfilePath = path.join(
        UPS_DIR,
        filename
    );

    return fsync.readFileSync(cmdfilePath, "utf-8");
};

export function getCountries() {
    return new Map(JSON.parse(readFile("Zones.json")));
}

const jsons = ["doc.json", "non-doc.json", "multiplier.json"]

function ifExists(path: string): boolean {
    for (const json of jsons) {
        if (!fsync.existsSync(`${path}/${json}`)) return false;
    }

    return true;
}

async function parseZones(filename: string) {
    const filePath = path.join(
        UPS_DIR,
        filename
    );

    const file = await fs.readFile(filePath, "utf-8");

    const zones = new Map();

    parse(file, {
        skipFirstNLines: 1,
        header: false,
        complete: function (results) {
            results.data.forEach((record) => {
                for (let i = 0; i < record.length; i += 2) { // only country name and zone
                    let name = record[i];
                    if (!name) continue;

                    let zone = record[i + 1].trim();
                    if (zone.startsWith("Special Rate")) {
                        zone = name;
                    }
                    zones.set(name.trim(), {zone});
                }
            });
        },
    });

    await fs.writeFile(path.join(UPS_DIR, 'Zones.json'), JSON.stringify(Array.from(zones.entries())));
}

// Maybe move then locally
const doc = new Map();
const nondoc = new Map();
const multiplierWeights = [];

// Populates maps and arrays with csv data
async function parseCSV(filePath) {
    const file = await fs.readFile(filePath, "utf-8");

    parse(file, {
        header: false,
        complete: function (results) {
            // FIXME: maybe move them out?
            const DOC_LENGTH = 10;
            const NON_DOC_LENGTH = 40;
            const MULTIPLIER_LENGTH = 6;

            const header = results.data[0];

            for (let i = 0; i < DOC_LENGTH; i++) {
                const record = results.data[i + 1];
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    let key = j.toString().trim();
                    if (!header[j].trim().startsWith("ZONE")) {
                        key = header[j].trim();
                    }
                    mapping.set(key, record[j].trim());
                }
                doc.set(record[0].trim(), mapping);
            }

            for (let i = 0; i < NON_DOC_LENGTH; i++) {
                const record = results.data[i + (DOC_LENGTH + 1) + 1]; // 2 for headers (0-based index so only +1)
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    let key = j.toString().trim();
                    if (!header[j].trim().startsWith("ZONE")) {
                        key = header[j].trim();
                    }
                    mapping.set(key, record[j].trim());
                }
                nondoc.set(record[0].trim(), mapping);
            }

            for (let i = 0; i < MULTIPLIER_LENGTH; i++) {
                const record = results.data[i + (DOC_LENGTH + NON_DOC_LENGTH + 2) + 1];
                const mapping = new Map();

                for (let j = 1; j < record.length; j++) {
                    let key = j.toString().trim();
                    if (!header[j].trim().startsWith("ZONE")) {
                        key = header[j].trim();
                    }
                    mapping.set(key, record[j].trim());
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

export async function prepareUPS(filename: string): Promise<void> {
    if (!fsync.existsSync(path.join(UPS_DIR, 'Zones.json'))) {
        await parseZones(`ZonesUPS.csv`);
    }

    const filePath = path.join(
        UPS_DIR,
        filename
    );

    if (ifExists(filePath)) return;

    console.log(`\x1b[31mNecessary files doens't exist for UPS/${filename}.csv, parsing CSVs\x1b[0m`)
    // do the parsing for the said file
    await parseCSV(`${filePath}.csv`)

    // write to corresponding files
    await fs.mkdir(filePath, {recursive: true});
    await fs.writeFile(`${filePath}/doc.json`, serializeMap(doc));
    await fs.writeFile(`${filePath}/non-doc.json`, serializeMap(nondoc));
    await fs.writeFile(`${filePath}/multiplier.json`, JSON.stringify(multiplierWeights));

    return; // dun
}
