import {getCountries, prepareDHL} from "@/app/_lib/dhl/util";
import Home from "@/app/Home";

export const dynamic = 'force-dynamic'

export default async function Page() {
    /**
     * 1. On request, check if serialized json files for doc and non-doc maps are available
     * 2. If not call prepareDHL(filename)
     * 3. Proceed
     * 4. Additionally, in future, if we want to include different csv files other than DHL, we can create a hierarchy over page
     * 5. Page would turn into another component which will be called after a dropdown or a loop on the UI
     */
    await prepareDHL("FranchiseExport");

    const zones = getCountries();

    return <Home zones={zones}/>;
}
