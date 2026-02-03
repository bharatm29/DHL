import pkg from "papaparse";
const { parse } = pkg;

const zones = new Map();
const doc = new Map();
const nondoc = new Map();
const form = document.querySelector("#countryForm");
const dropdown = document.querySelector("#country");
const weightInput = document.querySelector("#weight");
const lengthInput = document.querySelector("#length");
const widthInput = document.querySelector("#width");
const heightInput = document.querySelector("#height");
const typeInput = document.querySelector("#type");
const result = document.querySelector("#result");

const MAX_DOC_WEIGHT = 2.0;
const MAX_NON_DOC_WEIGHT = 30.0;

const multiplierWeights = [];

(async function () {
    const filename = "/Zonal2026.csv";
    const res = await fetch(filename);
    const file = await res.text();

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
                    zones.set(name.trim(), { code, zone });
                    let opt = document.createElement("option");
                    opt.value = name;
                    opt.innerHTML = name;
                    dropdown.appendChild(opt);
                }
            });
        },
    });
})();

(async function () {
    const filename = "/TarrifRates.csv";
    const res = await fetch(filename);
    const file = await res.text();

    parse(file, {
        header: false,
        complete: function (results) {
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

            for(let i = 0; i < MULTIPLIER_LENGTH; i++) {
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
})();

function calculateWeight() {
    const length = lengthInput.value;
    const width =  widthInput.value;
    const height = heightInput.value;

    const volumetricWeight = (length * width * height) / 5000.0;

    return Math.max(weightInput.value, volumetricWeight);
}

function findNearest(weight) {
    //FIXME: Assuming it cannot be more than 500kg
    for(let w of multiplierWeights) {
        if (weight <= w) return w;
    }
}

function handleSubmit(e) {
    e.preventDefault();
    const name = dropdown.value;
    if (!zones.has(name)) {
        result.innerHTML = "Couldn't find country";
        return;
    }

    const obj = zones.get(name);
    const zone = obj.zone.trim();

    const weight = calculateWeight();
    if (weight >= 500.1) {
        console.log("Shipment cannot be 500.1kg")
    }

    let rounded = 0.0;
    // FIXME: need more robust login
    if (weight <= 20.0) {
        rounded = (Math.ceil(weight / 0.5) * 0.5).toFixed(1);
        console.log(rounded.toString());
    } else if (weight <= 30.0) {
        rounded = Math.ceil(weight).toFixed(1);
    } else {
        rounded = findNearest(weight);
        // FIXME: find per kilo using multiplier (need to parse them)
        result.innerHTML = "<h1>&gt30 not yet implemented</h1>";
    }

    console.log(`${type.value} => map[${rounded}][${zone}]`)
    if (typeInput.value == "doc" && rounded <= MAX_DOC_WEIGHT) {
        console.log("Calculating doc type")
        const cost = doc.get(rounded.toString()).get(zone);
        result.innerHTML = `Cost is: ${cost}`;
    } else if (rounded <= MAX_NON_DOC_WEIGHT) {
        console.log(`SEEMA CROSSED FOR DOC: ${rounded} > ${MAX_DOC_WEIGHT}, calculating non-doc`);
        const cost = nondoc.get(rounded.toString()).get(zone);
        result.innerHTML = `Non-doc: Cost is: ${cost}`;
    } else {
        console.log(nondoc.get(rounded.toString()).get(zone))
        const cost = nondoc.get(rounded.toString()).get(zone) * weight;
        result.innerHTML = `Multiplier: Cost is: ${cost}`;
    }
}

console.log(doc)
console.log(nondoc)

form.addEventListener("submit", handleSubmit);

/*
 * weight => w
 * height
 * length
 * width
 *
 * l * w * h / 5000 => x
 *
 * max(x, w) => nearest price
 *
 * product type -> doc <-> non-doc
 */
