import {getCountries} from "@/app/_lib/dhl/zones";
import Home from "@/app/Home";


export default function Page() {
    const zones = getCountries();

    return <Home zones={zones}/>;
}
