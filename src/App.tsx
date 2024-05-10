import { useEffect, useMemo, useState, useTransition } from "react";

import { DataRow } from "components/DataRow.tsx";
import { DataTable } from "components/DataTable.tsx";
import {
    AllCutsceneNames,
    BOTW_FPS,
    CutsceneData,
    Cutscenes,
    LangCode,
    LangMap,
    Langs,
    compareTime,
    getDataById,
    getDataByName,
    getIdByName,
    newLangMap,
} from "data.ts";
import { calc } from "addtime";

function loadFromHash(): string[] {
    const hash = window.location.hash;
    if (!hash) {
        return [];
    }
    return hash
        .substring(1)
        .split(",")
        .map((id) => getDataById(id)?.name)
        .filter(Boolean) as string[];
}

export const App = () => {
    const [selected, setSelected] = useState<string[]>(loadFromHash);
    const [showUnselected, setShowUnselected] = useState(true);

    const [_, startTransition] = useTransition();

    useEffect(() => {
        startTransition(() => {
            const ids = selected.map((name) => getIdByName(name));
            ids.sort();
            window.location.hash = ids.join(",");
        });
    }, [selected]);

    const { slowest, fastest, secondFastest, comparison } =
        useComparison(selected);

    return (
        <>
            <h1>Fastest Language for Breath of the Wild Speedruns</h1>
            <p>
                Check the cutscenes that you will get in the run. If a cutscene
                is not listed, it is roughly the same speed in all languages.
                Hover over the language code to see the full language name. If a
                language is not listed, it is because it doesn't have voice
                acting in that language. Data from{" "}
                <a href="https://www.youtube.com/watch?v=yVaZdsgjWz8">
                    Bloom's comparison video
                </a>
            </p>
            <input
                id="select-all"
                type="checkbox"
                checked={new Set(selected).size === AllCutsceneNames.length}
                onChange={(e) => {
                    if (e.target.checked) {
                        setSelected(AllCutsceneNames);
                    } else {
                        setSelected([]);
                    }
                }}
            />
            <label htmlFor="select-all">Select All</label>
            <input
                id="show-unselected"
                type="checkbox"
                checked={showUnselected}
                onChange={(e) => setShowUnselected(e.target.checked)}
            />
            <label htmlFor="show-unselected">Show Unselected</label>
            {Cutscenes.map(({ name, data }) => {
                const checked = data.every(({ name }) =>
                    selected.includes(name),
                );
                if (!checked && !showUnselected) {
                    return null;
                }
                return (
                    <DataTable
                        key={name}
                        title={name}
                        checked={checked}
                        setChecked={(checked) => {
                            if (checked) {
                                setSelected((selected) => [
                                    ...selected,
                                    ...data.map(({ name }) => name),
                                ]);
                            } else {
                                setSelected((selected) =>
                                    selected.filter(
                                        (s) =>
                                            !data.some(
                                                ({ name }) => name === s,
                                            ),
                                    ),
                                );
                            }
                        }}
                    >
                        {data.map(
                            ({ name, description, deltas, slowest }, i) => {
                                const checked = selected.includes(name);
                                if (!checked && !showUnselected) {
                                    return null;
                                }
                                return (
                                    <DataRow
                                        key={i}
                                        label={getLabel(name, description)}
                                        checked={checked}
                                        setChecked={(checked) => {
                                            if (checked) {
                                                setSelected((selected) => [
                                                    ...selected,
                                                    name,
                                                ]);
                                            } else {
                                                setSelected((selected) =>
                                                    selected.filter(
                                                        (s) => s !== name,
                                                    ),
                                                );
                                            }
                                        }}
                                        times={deltas}
                                        slowest={slowest}
                                    />
                                );
                            },
                        )}
                    </DataTable>
                );
            })}
            <DataTable title="" checked={false}>
                <DataRow
                    label="Total"
                    checked={true}
                    times={comparison}
                    slowest={slowest}
                />
            </DataTable>
            {getDescription(slowest, fastest, secondFastest, comparison)}
        </>
    );
};

function getDescription(
    slowest: LangCode[],
    fastest: LangCode[],
    secondFastest: LangCode[],
    result: Record<LangCode, string>,
): JSX.Element {
    if (!fastest.length) {
        return <p>Please select at least one cutscene</p>;
    }

    const fastestLangs = fastest.map((lang) => LangMap[lang]);
    const secondFastestLangs = secondFastest.map((lang) => LangMap[lang]);
    const slowestLangs = slowest.map((lang) => LangMap[lang]);
    return (
        <p>
            The fastest language{fastest.length > 1 ? "s are:" : " is"}{" "}
            <b>{fastestLangs.join(", ")}</b>. The second fastest language
            {secondFastest.length > 1 ? "s are:" : " is"}{" "}
            <b>{secondFastestLangs.join(", ")}</b>, which{" "}
            {secondFastest.length > 1 ? "are" : "is"} {result[secondFastest[0]]}
            ms slower than the fastest. The slowest language
            {slowest.length > 1 ? "s are:" : " is"}{" "}
            <b>{slowestLangs.join(", ")}</b>.
        </p>
    );
}

function getLabel(name: string, description: string): string {
    if (!description) {
        return name;
    }
    return `${name} - ${description}`;
}

/// Calculate the comparision
function useComparison(selected: string[]) {
    const [result, setResult] = useState<Record<LangCode, string>>(newLangMap);
    const [slowest, setSlowest] = useState<LangCode[]>([]);
    const [_, startTransition] = useTransition();
    useEffect(() => {
        startTransition(() => {
            if (!selected.length) {
                setResult(newLangMap());
                return;
            }
            // construct time expressions
            const result: string[] = new Array(Langs.length).fill("0");
            const selectedData = [...new Set(selected)]
                .map(getDataByName)
                .filter(Boolean) as CutsceneData[];
            selectedData.forEach(({ deltas }) => {
                for (let i = 0; i < Langs.length; i++) {
                    const l = Langs[i].short;
                    const time = deltas[l];
                    if (!time || time === "0") {
                        continue;
                    }
                    result[i] = result[i] + "+" + time;
                }
            });
            // evaluate the expressions
            for (let i = 0; i < result.length; i++) {
                const { answers, errors } = calc(result[i], BOTW_FPS);
                if (errors.length) {
                    errors.forEach(console.error);
                    setResult(newLangMap("ERROR"));
                    return;
                }
                result[i] = answers[0];
            }
            // find the min and max in answers (the least slow = fastest)
            let minIndex = 0;
            let min = result[0];
            let maxIndices = [0];
            let max = result[0];
            for (let i = 1; i < result.length; i++) {
                if (compareTime(result[i], min) < 0) {
                    min = result[i];
                    minIndex = i;
                }
                const maxCompare = compareTime(result[i], max);
                if (maxCompare > 0) {
                    max = result[i];
                    maxIndices = [i];
                } else if (maxCompare === 0) {
                    maxIndices.push(i);
                }
            }
            // subtract the min from all answers
            for (let i = 0; i < result.length; i++) {
                if (i === minIndex) {
                    result[i] = "0";
                    continue;
                }
                const { answers, errors } = calc(
                    result[i] + " - " + min,
                    BOTW_FPS,
                );
                if (errors.length) {
                    errors.forEach(console.error);
                    setResult(newLangMap("ERROR"));
                    return;
                }
                result[i] = answers[0];
            }
            // set the result
            const newResult = newLangMap();
            for (let i = 0; i < Langs.length; i++) {
                newResult[Langs[i].short] = result[i];
            }
            setResult(newResult);
            setSlowest(maxIndices.map((i) => Langs[i].short));
        });
    }, [selected]);

    const { fastest, secondFastest } = useMemo(() => {
        const fastest: LangCode[] = [];
        for (const lang of Langs) {
            if (result[lang.short] === "0") {
                fastest.push(lang.short);
            }
        }

        let minCode: LangCode[] = [];
        let min = undefined;
        for (const lang of Langs) {
            if (result[lang.short] === "0") {
                continue;
            }
            if (min === undefined) {
                min = result[lang.short];
                minCode = [lang.short];
                continue;
            }
            const compare = compareTime(result[lang.short], min);

            if (compare < 0) {
                min = result[lang.short];
                minCode = [lang.short];
            } else if (compare === 0) {
                minCode.push(lang.short);
            }
        }

        return { fastest, secondFastest: minCode };
    }, [result]);

    return {
        slowest,
        fastest,
        secondFastest,
        comparison: result,
        diffFromSlowest: slowest[0] ? result[slowest[0]] : "0",
    };
}
