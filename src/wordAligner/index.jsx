import {createRoot} from "react-dom/client";
import {SpSpa} from "pithekos-lib";
import WordAligner from "./WordAligner";
import './index.css';

createRoot(document.getElementById("root"))
    .render(
        <SpSpa
            requireNet={false}
            titleKey="pages:uw-client-word-aligner:title"
            currentId="uw-client-word-aligner"
        >
            <WordAligner/>
        </SpSpa>
    );
