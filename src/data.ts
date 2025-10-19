//! Data for the application
//! Based on https://www.youtube.com/watch?v=yVaZdsgjWz8

import { calc, makeQuantum, stringifyMs, toMilliseconds } from "addtime";

export const BOTW_FPS = 30n;

/// Languages
export type LangData = {
    /// Short code for the language (used in table)
    short: string;
    /// Display name for the language
    display: string;
};

/// All languages
export const Langs = [
    {
        short: "EN",
        display: "English",
    },
    {
        short: "JA",
        display: "Japanese",
    },
    {
        short: "DE",
        display: "German",
    },
    {
        short: "LA",
        display: "Spanish (Latin America)",
    },
    {
        short: "ES",
        display: "Spanish (Spain)",
    },
    {
        short: "IT",
        display: "Italian",
    },
    {
        short: "CA",
        display: "French (Canada)",
    },
    {
        short: "FR",
        display: "French (France)",
    },
    {
        short: "RU",
        display: "Russian",
    },
] as const satisfies LangData[];

export type LangCode = (typeof Langs)[number]["short"];

export const LangMap = Object.fromEntries(
    Langs.map(({ short, display }) => [short, display]),
);

/// One category of cutscenes. This is purely for organization.
export type CutsceneCategoryData = {
    /// Display name for the category
    name: string;
    /// Cutscenes in this category
    data: CutsceneData[];
};

/// Data for each cutscene
export type CutsceneData = {
    /// Display name of the cutscene
    name: string;

    /// Secondary description
    description: string;

    /// Delta for each language
    /// 0 is the fastest, a timecode like 1m30s678 is how much
    /// the language is slower compared to the fastest language
    deltas: Record<LangCode, string>;

    /// Which languages are the slowest
    slowest: LangCode[];
};

/// Helper to parse the data
function category(strings: TemplateStringsArray): CutsceneCategoryData {
    const lines = strings
        .join("")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    if (lines.length < 2) {
        throw new Error("Invalid category data, need at least 2 lines");
    }
    const [header, ...rest] = lines;
    const [name, ...langs] = header.split("|").map((s) => s.trim());
    if (!name) {
        throw new Error("Invalid category data, missing name");
    }
    if (langs.length !== Langs.length) {
        throw new Error("Invalid category data, wrong number of languages");
    }
    for (const lang of langs) {
        if (!Langs.some((l) => l.short === lang)) {
            throw new Error(`Invalid category data, unknown language ${lang}`);
        }
    }

    const data = rest.map((line) => {
        const [namePart, ...deltaFrames] = line.split("|").map((s) => s.trim());
        if (!namePart) {
            throw new Error("Invalid cutscene data, missing name");
        }
        let name: string, description: string;
        const commaIndex = namePart.indexOf(",");
        if (commaIndex !== -1) {
            name = namePart.substring(0, commaIndex).trim();
            description = namePart.substring(commaIndex + 1).trim();
        } else {
            name = namePart;
            description = "";
        }
        if (deltaFrames.length !== Langs.length) {
            throw new Error("Invalid cutscene data, wrong number of deltas");
        }
        const slowest: LangCode[] = [];
        const deltas = deltaFrames.map(parseDelta);
        for (let i = 0; i < deltas.length; i++) {
            if (deltas[i] === "0") {
                slowest.push(Langs[i].short);
            }
        }
        // the deltas are how much faster, we want to invert them
        // find the largest delta
        let maxDelta = deltas[0];
        let maxDeltaIndex = 0;
        for (let i = 1; i < deltas.length; i++) {
            if (compareTime(deltas[i], maxDelta) > 0) {
                maxDelta = deltas[i];
                maxDeltaIndex = i;
            }
        }
        // subtract all deltas from the max delta
        for (let i = 0; i < deltas.length; i++) {
            if (i === maxDeltaIndex) {
                deltas[i] = "0";
                continue;
            }
            const { answers, errors } = calc(
                maxDelta + " - " + deltas[i],
                BOTW_FPS,
            );
            if (errors.length) {
                errors.forEach(console.error);
                throw new Error("Error computing delta");
            }
            deltas[i] = answers[0];
        }
        const data: Record<string, string> = {};
        for (let i = 0; i < deltas.length; i++) {
            data[langs[i]] = deltas[i];
        }
        return {
            name,
            description,
            deltas: data,
            slowest,
        } satisfies CutsceneData;
    });

    return { name, data };
}

/// Helper to parse the delta
/// Input is <second>.<frame>
/// Output is time string in milliseconds
function parseDelta(delta: string): string {
    if (!delta) {
        return "0";
    }
    if (!delta.includes(".")) {
        throw new Error("Invalid delta format, no frame");
    }
    if (delta.split(".").length !== 2) {
        throw new Error("Invalid delta format, too many dots");
    }
    const [sec, frame] = delta.split(".").map((s) => BigInt(s));
    const ms = toMilliseconds(makeQuantum(frame, BOTW_FPS));
    return stringifyMs(ms.val + sec * 1000n);
}

/// All cutscenes data
export const Cutscenes: CutsceneCategoryData[] = [
    category`
Main Quests                                   | EN    | JA    | DE    | LA    | ES    | IT    | CA    | FR    | RU
Pick up Sheikah Slate                         | 00.10 |       | 03.28 | 01.29 | 00.14 | 01.27 | 03.28 | 04.01 | 00.27
Opening Outer Door of Shrine of Resurrection  |       | 03.10 | 10.01 | 05.01 | 05.21 | 06.10 | 03.28 | 07.00 | 07.25
Divine Beast Intro from Zelda                 | 07.01 |       | 09.03 | 08.18 | 12.13 | 12.11 | 08.13 | 11.14 | 06.08
After Last Divine Beast from Zelda            | 09.02 |       | 12.26 | 07.06 | 12.23 | 14.21 | 09.06 | 09.29 | 13.26
`,
    category`
Shrines                                       | EN    | JA    | DE    | LA    | ES    | IT    | CA    | FR    | RU
Qaza Tokki, Hebra/North Lomei Labyrinth       | 07.03 | 00.05 |       | 00.04 | 00.04 |       | 00.03 |       | 07.05
Dila Maag, Gerudo/South Lomei Labyrinth       | 07.07 | 00.07 |       | 00.07 | 00.07 | 00.02 | 00.05 | 00.02 | 07.07
Tu Kaloh, Akkala/Lomei Labyrinth Island       | 07.04 | 00.05 | 00.04 | 00.05 | 00.05 | 00.03 | 00.03 |       | 07.07
Ketoh Wawai, Thyphlo Ruins                    | 07.03 | 00.04 | 00.03 | 00.04 | 00.04 | 00.01 | 00.03 |       | 07.06
Korgu Chideh Intro, Eventide                  | 13.24 | 07.01 | 06.14 | 07.01 | 07.01 | 13.29 | 06.29 | 06.19 | 
Korgu Chideh Outro, Eventide                  | 06.28 | 07.02 | 07.02 | 00.01 |       | 06.29 | 07.01 | 06.27 | 07.02
All Shrines, Gift from the Monks              | 13.21 | 21.08 | 20.20 | 00.02 |       | 13.14 | 21.04 | 20.17 | 14.02
    `,
    category`
DLC                                           | EN    | JA    | DE    | LA    | ES    | IT    | CA    | FR    | RU
Trial of the Sword Monk Intro                 | 07.06 | 07.05 | 07.06 |       | 00.06 | 07.07 | 07.08 | 07.00 | 07.04
Thunderblight Reflight Intro                  |       | 07.00 | 07.03 | 06.27 | 07.02 | 07.01 | 07.00 | 07.01 | 07.01
Windblight Reflight Intro                     |       | 06.29 | 07.03 | 07.01 | 07.02 | 07.01 | 07.00 | 07.03 | 07.04
Waterblight Reflight Intro                    |       | 06.29 | 07.01 | 06.28 | 07.01 | 07.02 | 07.00 | 07.01 | 07.00
Fireblight Reflight Intro                     |       | 06.28 | 07.02 | 06.29 | 07.00 | 06.29 | 07.01 | 07.02 | 07.02
Thunderblight Reflight Outro                  | 02.26 |       | 01.12 |       | 00.05 | 00.09 | 00.05 | 00.24 | 00.14
Windblight Reflight Outro                     | 02.18 |       | 01.25 |       | 00.01 | 00.14 | 03.05 | 03.21 | 00.10
Waterblight Reflight Outro                    | 04.11 | 00.04 | 00.14 | 02.08 | 00.02 |       | 01.00 | 01.14 | 01.28
Fireblight Reflight Outro                     | 05.04 |       | 01.06 | 00.05 | 00.02 | 00.16 | 00.25 | 01.05 | 00.22
    `,
    category`
Small Differences                             | EN    | JA    | DE    | LA    | ES    | IT    | CA    | FR    | RU    
New Game                                      | 00.13 | 00.11 | 00.08 | 00.09 | 00.16 | 00.12 |       | 00.17 | 00.16
Head to the point ...                         | 01.14 | 01.16 | 01.24 | 01.23 | 01.14 | 01.26 |       | 01.20 | 01.11
First Encounter with Impa                     | 00.04 |       | 00.01 | 00.03 |       | 00.02 | 00.01 | 00.01 | 00.02
Zelda's Monologue After the Last Memory       |       | 00.04 | 00.02 | 00.05 | 00.07 |       | 00.06 | 00.02 | 00.06
Ta'loh Naeg's Teaching                        | 00.17 | 00.18 | 00.14 | 00.07 | 00.18 | 00.20 | 00.15 |       | 00.12
Toh Yahsa, Trial of Thunder                   | 00.03 | 00.04 | 00.05 | 00.08 |       | 00.05 | 00.07 | 00.04 | 00.08
EX The Champions' Ballad Intro by Zelda       | 00.24 | 00.27 | 00.26 | 00.29 | 00.29 | 00.24 |       | 00.23 | 00.13
Great Plateau Revisit Intro                   |       | 00.10 | 00.04 | 00.15 | 00.09 | 00.04 | 00.15 | 00.04 | 00.16
Great Plateau Revisit Outro                   | 00.04 | 00.03 |       |       | 00.05 | 00.02 | 00.04 | 00.04 | 00.03
Trial of the Sword Monk Outro                 | 00.07 | 00.11 | 00.11 | 00.03 | 00.14 | 00.15 | 00.13 |       | 00.06
Gift from DLC Shrine Monk First and Second    | 00.04 | 00.04 |       | 00.05 | 00.05 | 00.02 | 00.03 | 00.05 | 
Gift from DLC Shrine Monk Third               | 00.04 | 00.02 | 00.03 |       | 00.03 | 00.02 | 00.01 | 00.03 | 00.02
Pedestal for Urbosa's Song Quests             | 00.04 | 00.03 | 00.01 | 00.05 | 00.05 | 00.04 | 00.04 | 00.04 | 
Kass' Poem for Urbosa's Song Quests           | 01.04 | 01.04 |       | 01.04 | 01.04 | 01.02 | 00.28 | 00.26 | 01.01
Pedestal for Revali's Song Quests             | 00.04 | 00.01 | 00.09 | 00.01 | 00.03 | 00.02 | 00.04 | 00.06 | 
Kass' Poem for Revali's Song Quests           | 00.08 | 00.05 |       | 00.07 | 00.12 | 00.06 | 00.02 | 00.09 | 00.05
Pedestal for Mipha's Song Quests              | 00.05 | 00.01 | 00.09 | 00.05 | 00.06 | 00.05 |       | 00.07 | 00.03
Kass' Poem for Mipha's Song Quests            | 00.28 | 00.28 | 00.25 | 01.08 | 01.12 | 00.27 |       | 00.29 | 00.29
Pedestal for Daruk's Song Quests              | 00.06 | 00.03 | 00.09 | 00.05 | 00.06 | 00.04 |       | 00.10 | 00.03
Kass' Poem for Daruk's Song Quests            | 00.10 | 00.08 | 00.03 | 00.07 | 00.12 | 00.08 |       | 00.07 | 00.07
Final Ground Invitation by Maz Koshia         | 00.04 |       | 00.03 |       | 00.03 | 00.03 | 00.01 | 00.03 | 
Final Ground Intro                            | 00.05 |       | 00.07 | 00.03 | 00.06 | 00.06 | 00.05 | 00.08 | 00.07
Final Ground Start                            | 00.05 |       | 00.05 |       | 00.03 | 00.04 | 00.03 | 00.04 | 00.03
Maz Koshia Bossfight Intro                    | 00.03 | 00.13 | 00.10 | 00.09 | 00.09 |       | 00.12 | 00.12 | 00.07
Maz Koshia Bossfight Outro                    | 00.26 | 00.19 | 00.25 | 00.16 | 00.13 |       | 00.25 | 01.01 | 00.15
Master Cycle Zero Gift                        | 00.02 | 00.02 | 00.04 |       | 00.02 | 00.01 | 00.03 | 00.03 | 00.01
EX The Champion's Ballad Outro by Zelda       |       | 00.03 | 00.03 |       | 00.02 | 00.01 | 00.04 | 00.05 | 00.02
    `,
];

export const AllCutsceneNames = Cutscenes.flatMap(({ data }) =>
    data.map(({ name }) => name),
);

/// Get a shorter id for the cutscene by its name
export function getIdByName(name: string): string {
    for (let i = 0; i < Cutscenes.length; i++) {
        const category = Cutscenes[i];
        for (let j = 0; j < category.data.length; j++) {
            if (category.data[j].name === name) {
                return `${i}-${j}`;
            }
        }
    }
    return "";
}

/// Get data for the cutscene by its name
export function getDataByName(name: string): CutsceneData | undefined {
    for (let i = 0; i < Cutscenes.length; i++) {
        const category = Cutscenes[i];
        for (let j = 0; j < category.data.length; j++) {
            if (category.data[j].name === name) {
                return category.data[j];
            }
        }
    }
}

/// Get the cutscene data by its id
export function getDataById(id: string): CutsceneData | undefined {
    const [cat, cut] = id.split("-").map((s) => parseInt(s, 10));
    if (isNaN(cat) || isNaN(cut)) {
        return undefined;
    }
    return Cutscenes[cat]?.data[cut];
}

export function newLangMap(fill?: string): Record<LangCode, string> {
    const map: Record<LangCode, string> = {} as Record<LangCode, string>;
    for (const lang of Langs) {
        map[lang.short] = fill || "";
    }
    return map;
}

export function compareTime(a: string, b: string): number {
    const { answers, errors } = calc((a || "0") + "-" + (b || "0"), BOTW_FPS);
    if (errors.length) {
        errors.forEach(console.error);
        return 0;
    }
    const answer = answers[0];
    if (answer === "000") {
        return 0;
    }
    if (answer.startsWith("-")) {
        return -1;
    }
    return 1;
}
