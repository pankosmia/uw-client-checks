import {createRoot} from "react-dom/client";
import {SpSpa} from "pithekos-lib";
import App from "./App";
import './index.css';

createRoot(document.getElementById("root"))
    .render(
        <SpSpa
            requireNet={false}
            titleKey="pages:uw-client-word-aligner:title"
            currentId="uw-client-word-aligner"
        >
            <App/>
        </SpSpa>
    );
