'use server';

import {getCountries} from "@/app/_lib/dhl/zones";
import fs from "fs/promises";
import path from "path";

import {parse} from "papaparse";

const MAX_DOC_WEIGHT = 2.0;
const MAX_NON_DOC_WEIGHT = 30.0;

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

function calculateWeight(data): number {
    const length = data.length;
    const width = data.width;
    const height = data.height;

    const volumetricWeight = (length * width * height) / 5000.0;

    return Math.max(data.weight, volumetricWeight);
}

function findNearest(weight: number) {
    //FIXME: Assuming it cannot be more than 500kg
    for (let w of multiplierWeights) {
        if (weight <= w) return w;
    }
}

export async function calculate(data: {
    country: string,
    weight: number,
    length: number,
    height: number,
    width: number,
    type: string
}): Promise<[result: number, weight: number, error: string, calculatedType: string]> {
    if (data.weight === 0 || data.length === 0 || data.width === 0 || data.height === 0) {
        return [-1, -1, "0 value for properties", ""];
    }

    // FIXME: exclusively for DHL sheets
    // FIXME: Right now only doing FranchiseCost - Export
    const zones = getCountries()
    const name = data.country
    if (!zones.has(name)) {
        return [-1, -1, "Couldn't find country", ""];
    }

    const obj = zones.get(name);
    const zone = obj.zone.trim();

    await parseCSV("app/_lib/dhl/FranchiseExport.csv");

    const weight = calculateWeight(data);
    if (weight >= 500.1) {
        return [-1, -1, "Shipment cannot be 500.1kg", ""];
    }

    let rounded = 0.0;
    // FIXME: need more robust logic
    if (weight <= 20.0) {
        rounded = +((Math.ceil(weight / 0.5) * 0.5).toFixed(1));
        // console.log(rounded.toString());
    } else if (weight <= 30.0) {
        rounded = +(Math.ceil(weight).toFixed(1));
    } else {
        rounded = findNearest(weight);
        // FIXME: [find per kilo using multiplier (need to parse them)] -> maybe done??
    }

    let result = 0.0;
    let calculatedUnder = "non-doc";
    if (data.type == "doc" && rounded <= MAX_DOC_WEIGHT) {
        calculatedUnder = "doc";
        result = doc.get(rounded.toFixed(1)).get(zone);
    } else if (rounded <= MAX_NON_DOC_WEIGHT) {
        console.log(`SEEMA CROSSED FOR DOC: ${rounded} > ${MAX_DOC_WEIGHT}, calculating non-doc`);
        result = nondoc.get(rounded.toFixed(1)).get(zone);
    } else {
        console.log(nondoc.get(rounded.toString()).get(zone))
        result = nondoc.get(rounded.toString()).get(zone) * weight;
    }

    return [result, rounded, "", calculatedUnder];
}