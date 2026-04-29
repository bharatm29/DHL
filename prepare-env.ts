import { prepareDHL } from './app/_lib/dhl/util';
import { prepareUPS } from './app/_lib/ups/util';

(async function() {
    await prepareDHL("FranchiseExport");
    await prepareUPS("FranchiseExport");
}());
