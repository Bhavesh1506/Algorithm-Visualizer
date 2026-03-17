import { useEffect, useMemo, useRef, useState } from "react";

const ARRAY_MIN = 10;
const ARRAY_MAX = 100;
const VALUE_MIN = 20;
const VALUE_MAX = 500;

const ALGORITHMS = [
  "Bubble Sort",
  "Selection Sort",
  "Insertion Sort",
  "Merge Sort",
  "Quick Sort",
];

const COMPLEXITY = {
  "Bubble Sort": { best: "O(n)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
  "Selection Sort": { best: "O(n^2)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
  "Insertion Sort": { best: "O(n)", average: "O(n^2)", worst: "O(n^2)", space: "O(1)" },
  "Merge Sort": {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
  },
  "Quick Sort": {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n^2)",
    space: "O(log n)",
  },
};

const SPEED_OPTIONS = [
  { label: "Slow", ms: 260 },
  { label: "Medium", ms: 120 },
  { label: "Fast", ms: 36 },
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const buildRandomArray = (size) =>
  Array.from({ length: size }, () => randomInt(VALUE_MIN, VALUE_MAX));

const buildRacePanelState = (arr) => ({
  array: [...arr],
  comparingIndices: [],
  swappingIndices: [],
  sortedFlags: Array(arr.length).fill(false),
  comparisons: 0,
  swaps: 0,
  isFinished: false,
  timeMs: null,
});

async function* bubbleSort(input) {
  const arr = [...input];
  const n = arr.length;
  for (let i = 0; i < n; i += 1) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j += 1) {
      yield { type: "compare", indices: [j, j + 1] };
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
        yield { type: "swap", indices: [j, j + 1], array: [...arr] };
      }
    }
    yield { type: "markSorted", indices: [n - i - 1] };
    if (!swapped) {
      const rest = [];
      for (let k = 0; k < n - i - 1; k += 1) rest.push(k);
      if (rest.length) yield { type: "markSorted", indices: rest };
      break;
    }
  }
}

async function* selectionSort(input) {
  const arr = [...input];
  const n = arr.length;
  for (let i = 0; i < n; i += 1) {
    let min = i;
    for (let j = i + 1; j < n; j += 1) {
      yield { type: "compare", indices: [min, j] };
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min], arr[i]];
      yield { type: "swap", indices: [i, min], array: [...arr] };
    }
    yield { type: "markSorted", indices: [i] };
  }
}

async function* insertionSort(input) {
  const arr = [...input];
  for (let i = 1; i < arr.length; i += 1) {
    let j = i;
    while (j > 0) {
      yield { type: "compare", indices: [j - 1, j] };
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        yield { type: "swap", indices: [j - 1, j], array: [...arr] };
      } else {
        break;
      }
      j -= 1;
    }
    yield { type: "markSorted", indices: Array.from({ length: i + 1 }, (_, idx) => idx) };
  }
}

async function* mergeSort(input) {
  const arr = [...input];
  async function* sort(left, right) {
    if (left >= right) return;
    const mid = Math.floor((left + right) / 2);
    yield* sort(left, mid);
    yield* sort(mid + 1, right);
    let i = left;
    let j = mid + 1;
    const merged = [];
    while (i <= mid && j <= right) {
      yield { type: "compare", indices: [i, j] };
      if (arr[i] <= arr[j]) merged.push(arr[i++]);
      else merged.push(arr[j++]);
    }
    while (i <= mid) merged.push(arr[i++]);
    while (j <= right) merged.push(arr[j++]);
    for (let k = 0; k < merged.length; k += 1) {
      arr[left + k] = merged[k];
      yield { type: "overwrite", indices: [left + k], array: [...arr] };
    }
  }
  yield* sort(0, arr.length - 1);
}

async function* quickSort(input) {
  const arr = [...input];
  async function* sort(low, high) {
    if (low > high) return;
    if (low === high) {
      yield { type: "markSorted", indices: [low] };
      return;
    }
    const pivotValue = arr[high];
    let pivotIndex = low;
    for (let j = low; j < high; j += 1) {
      yield { type: "compare", indices: [j, high] };
      if (arr[j] < pivotValue) {
        if (pivotIndex !== j) {
          [arr[pivotIndex], arr[j]] = [arr[j], arr[pivotIndex]];
          yield { type: "swap", indices: [pivotIndex, j], array: [...arr] };
        }
        pivotIndex += 1;
      }
    }
    [arr[pivotIndex], arr[high]] = [arr[high], arr[pivotIndex]];
    yield { type: "swap", indices: [pivotIndex, high], array: [...arr] };
    yield { type: "markSorted", indices: [pivotIndex] };
    yield* sort(low, pivotIndex - 1);
    yield* sort(pivotIndex + 1, high);
  }
  yield* sort(0, arr.length - 1);
}

const GENERATORS = {
  "Bubble Sort": bubbleSort,
  "Selection Sort": selectionSort,
  "Insertion Sort": insertionSort,
  "Merge Sort": mergeSort,
  "Quick Sort": quickSort,
};

export default function SortingVisualizer() {
  const initialArrayRef = useRef(buildRandomArray(40));
  const [arraySize, setArraySize] = useState(40);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [algorithm, setAlgorithm] = useState("Bubble Sort");
  const [array, setArray] = useState(initialArrayRef.current);
  const [comparingIndices, setComparingIndices] = useState([]);
  const [swappingIndices, setSwappingIndices] = useState([]);
  const [sortedFlags, setSortedFlags] = useState(() => Array(40).fill(false));
  const [isSorting, setIsSorting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [isRaceMode, setIsRaceMode] = useState(false);
  const [leftAlgorithm, setLeftAlgorithm] = useState("Bubble Sort");
  const [rightAlgorithm, setRightAlgorithm] = useState("Quick Sort");
  const [leftRace, setLeftRace] = useState(buildRacePanelState(initialArrayRef.current));
  const [rightRace, setRightRace] = useState(buildRacePanelState(initialArrayRef.current));
  const [baseRaceArray, setBaseRaceArray] = useState(initialArrayRef.current);
  const [isRaceSorting, setIsRaceSorting] = useState(false);
  const [winner, setWinner] = useState(null);

  const speedMsRef = useRef(SPEED_OPTIONS[1].ms);
  const isPausedRef = useRef(false);
  const pauseResolverRef = useRef(null);
  const runIdRef = useRef(0);
  const raceRunIdRef = useRef(0);
  const complexity = useMemo(() => COMPLEXITY[algorithm], [algorithm]);

  useEffect(() => {
    speedMsRef.current = SPEED_OPTIONS[speedLevel].ms;
  }, [speedLevel]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const releasePauseIfNeeded = () => {
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
  };

  const clearTransientHighlights = () => {
    setComparingIndices([]);
    setSwappingIndices([]);
  };

  const stopAllRuns = () => {
    runIdRef.current += 1;
    raceRunIdRef.current += 1;
    setIsSorting(false);
    setIsPaused(false);
    setIsRaceSorting(false);
    releasePauseIfNeeded();
  };

  const resetStateWithNewArray = (size) => {
    const next = buildRandomArray(size);
    stopAllRuns();
    setWinner(null);
    setArray(next);
    setSortedFlags(Array(size).fill(false));
    clearTransientHighlights();
    setBaseRaceArray(next);
    setLeftRace(buildRacePanelState(next));
    setRightRace(buildRacePanelState(next));
  };

  useEffect(() => {
    resetStateWithNewArray(arraySize);
  }, [arraySize]);

  const waitWhilePaused = async () => {
    while (isPausedRef.current) {
      await new Promise((resolve) => {
        pauseResolverRef.current = resolve;
      });
    }
  };

  const applyStep = (step, currentRunId) => {
    if (currentRunId !== runIdRef.current) return;
    if (step.type === "compare") {
      setComparingIndices(step.indices);
      setSwappingIndices([]);
      return;
    }
    if (step.type === "swap" || step.type === "overwrite") {
      setArray(step.array);
      setSwappingIndices(step.indices);
      setComparingIndices([]);
      return;
    }
    if (step.type === "markSorted") {
      setSortedFlags((prev) => {
        const next = [...prev];
        step.indices.forEach((idx) => {
          if (idx >= 0 && idx < next.length) next[idx] = true;
        });
        return next;
      });
    }
  };

  const startSort = async () => {
    if (isSorting || isRaceSorting) return;
    const sortGenerator = GENERATORS[algorithm];
    if (!sortGenerator) return;

    const currentRunId = runIdRef.current + 1;
    runIdRef.current = currentRunId;
    setIsSorting(true);
    setIsPaused(false);
    releasePauseIfNeeded();
    setSortedFlags(Array(array.length).fill(false));
    clearTransientHighlights();

    try {
      const generator = sortGenerator([...array]);
      for await (const step of generator) {
        if (currentRunId !== runIdRef.current) break;
        await waitWhilePaused();
        if (currentRunId !== runIdRef.current) break;
        applyStep(step, currentRunId);
        await delay(speedMsRef.current);
      }
    } finally {
      if (currentRunId === runIdRef.current) {
        setIsSorting(false);
        setIsPaused(false);
        setSortedFlags(Array(array.length).fill(true));
        clearTransientHighlights();
      }
    }
  };

  const togglePause = () => {
    if (!isSorting || isRaceMode) return;
    if (isPausedRef.current) {
      setIsPaused(false);
      releasePauseIfNeeded();
    } else {
      setIsPaused(true);
    }
  };

  const onAlgorithmChange = (value) => {
    runIdRef.current += 1;
    setIsSorting(false);
    setIsPaused(false);
    releasePauseIfNeeded();
    setAlgorithm(value);
    setSortedFlags(Array(array.length).fill(false));
    clearTransientHighlights();
  };

  const applyRaceStep = (side, step) => {
    const update = side === "left" ? setLeftRace : setRightRace;

    update((prev) => {
      if (step.type === "compare") {
        return {
          ...prev,
          comparingIndices: step.indices,
          swappingIndices: [],
          comparisons: prev.comparisons + 1,
        };
      }

      if (step.type === "swap" || step.type === "overwrite") {
        return {
          ...prev,
          array: step.array,
          swappingIndices: step.indices,
          comparingIndices: [],
          swaps: prev.swaps + 1,
        };
      }

      if (step.type === "markSorted") {
        const nextSorted = [...prev.sortedFlags];
        step.indices.forEach((idx) => {
          if (idx >= 0 && idx < nextSorted.length) nextSorted[idx] = true;
        });
        return {
          ...prev,
          sortedFlags: nextSorted,
        };
      }

      return prev;
    });
  };

  const markRaceComplete = (side, algoName, elapsedMs, runId) => {
    if (runId !== raceRunIdRef.current) return;

    const update = side === "left" ? setLeftRace : setRightRace;
    update((prev) => ({
      ...prev,
      isFinished: true,
      timeMs: elapsedMs,
      sortedFlags: Array(prev.array.length).fill(true),
      comparingIndices: [],
      swappingIndices: [],
    }));

    setWinner((prev) => prev ?? { side, algorithm: algoName, timeMs: elapsedMs });
  };

  const runRaceRunner = async (side, algoName, sourceArray, runId, raceStartTime) => {
    const sortGenerator = GENERATORS[algoName];
    if (!sortGenerator) return;

    const generator = sortGenerator([...sourceArray]);
    for await (const step of generator) {
      if (runId !== raceRunIdRef.current) return;
      applyRaceStep(side, step);
      await delay(speedMsRef.current);
    }

    const elapsedMs = Number((performance.now() - raceStartTime).toFixed(2));
    markRaceComplete(side, algoName, elapsedMs, runId);
  };

  const startRace = async () => {
    if (isRaceSorting || isSorting) return;

    const sourceArray = [...baseRaceArray];
    const runId = raceRunIdRef.current + 1;
    raceRunIdRef.current = runId;
    setIsRaceSorting(true);
    setWinner(null);
    setLeftRace(buildRacePanelState(sourceArray));
    setRightRace(buildRacePanelState(sourceArray));

    const raceStartTime = performance.now();
    await Promise.all([
      runRaceRunner("left", leftAlgorithm, sourceArray, runId, raceStartTime),
      runRaceRunner("right", rightAlgorithm, sourceArray, runId, raceStartTime),
    ]);

    if (runId === raceRunIdRef.current) {
      setIsRaceSorting(false);
    }
  };

  const toggleRaceMode = () => {
    stopAllRuns();
    setWinner(null);
    setLeftRace(buildRacePanelState(baseRaceArray));
    setRightRace(buildRacePanelState(baseRaceArray));
    setSortedFlags(Array(array.length).fill(false));
    clearTransientHighlights();
    setIsRaceMode((prev) => !prev);
  };

  const getBarClass = (index) => {
    if (sortedFlags[index]) return "bg-green-500";
    if (swappingIndices.includes(index)) return "bg-red-500";
    if (comparingIndices.includes(index)) return "bg-yellow-400";
    return "bg-blue-500";
  };

  const getRaceBarClass = (side, state, index) => {
    if (state.sortedFlags[index]) return "bg-green-500";
    if (state.swappingIndices.includes(index)) return "bg-red-500";
    if (state.comparingIndices.includes(index)) return "bg-yellow-400";
    return side === "left" ? "bg-cyan-500" : "bg-violet-500";
  };

  const renderRacePanel = (side, algoName, state) => {
    const isWinner = winner?.side === side;
    return (
      <div
        className={`relative rounded-2xl border p-4 sm:p-5 ${
          side === "left"
            ? "border-cyan-800/70 bg-cyan-950/10"
            : "border-violet-800/70 bg-violet-950/10"
        }`}
      >
        {isWinner && (
          <div className="winner-banner absolute right-4 top-4 rounded-md px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-950">
            WINNER - {winner.timeMs} ms
          </div>
        )}

        <div className="mb-4 space-y-1">
          <h3 className="text-lg font-semibold text-gray-100">{algoName}</h3>
          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
              Comparisons: {state.comparisons}
            </span>
            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
              Swaps: {state.swaps}
            </span>
            <span className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1">
              {state.isFinished ? `Done: ${state.timeMs} ms` : "Running..."}
            </span>
          </div>
        </div>

        <div className="flex h-[280px] items-end gap-[2px] overflow-hidden rounded-lg border border-zinc-800 bg-[#111111] p-2 sm:h-[360px]">
          {state.array.map((value, index) => {
            const heightPercent = Math.max((value / VALUE_MAX) * 100, 2);
            return (
              <div
                key={`${side}-${index}-${value}`}
                className={`flex-1 rounded-t-sm transition-all duration-150 ease-out ${getRaceBarClass(
                  side,
                  state,
                  index
                )}`}
                style={{ height: `${heightPercent}%` }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Sorting Algorithm Visualizer
          </h1>
          <p className="text-sm text-gray-400">
            Blue/Cyan/Violet: default, Yellow: comparing, Red: swapping, Green: sorted
          </p>
        </div>
        <button
          type="button"
          onClick={toggleRaceMode}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            isRaceMode
              ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
              : "bg-zinc-800 text-gray-100 hover:bg-zinc-700"
          }`}
        >
          Race Mode: {isRaceMode ? "On" : "Off"}
        </button>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className={`grid gap-4 ${isRaceMode ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {isRaceMode ? (
            <>
              <label className="flex flex-col gap-2 text-sm">
                <span className="text-cyan-300">Left Algorithm</span>
                <select
                  value={leftAlgorithm}
                  onChange={(e) => setLeftAlgorithm(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-cyan-500"
                  disabled={isRaceSorting}
                >
                  {ALGORITHMS.map((name) => (
                    <option key={`left-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm">
                <span className="text-violet-300">Right Algorithm</span>
                <select
                  value={rightAlgorithm}
                  onChange={(e) => setRightAlgorithm(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-violet-500"
                  disabled={isRaceSorting}
                >
                  {ALGORITHMS.map((name) => (
                    <option key={`right-${name}`} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-gray-300">Algorithm</span>
              <select
                value={algorithm}
                onChange={(e) => onAlgorithmChange(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none ring-0 transition focus:border-zinc-500"
                disabled={isSorting}
              >
                {ALGORITHMS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-300">Speed: {SPEED_OPTIONS[speedLevel].label}</span>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={speedLevel}
              onChange={(e) => setSpeedLevel(Number(e.target.value))}
              className="accent-blue-500"
            />
          </label>

          <label className={`flex flex-col gap-2 text-sm ${isRaceMode ? "" : "lg:col-span-2"}`}>
            <span className="text-gray-300">Array Size: {arraySize}</span>
            <input
              type="range"
              min={ARRAY_MIN}
              max={ARRAY_MAX}
              step={1}
              value={arraySize}
              onChange={(e) => setArraySize(Number(e.target.value))}
              className="accent-blue-500"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => resetStateWithNewArray(arraySize)}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700"
          >
            Randomize Array
          </button>

          {isRaceMode ? (
            <button
              type="button"
              onClick={startRace}
              disabled={isRaceSorting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Start Race
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={startSort}
                disabled={isSorting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Sorting
              </button>
              <button
                type="button"
                onClick={togglePause}
                disabled={!isSorting}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
            </>
          )}
        </div>
      </section>

      {isRaceMode ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {renderRacePanel("left", leftAlgorithm, leftRace)}
          {renderRacePanel("right", rightAlgorithm, rightRace)}
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            <div className="flex h-[320px] items-end gap-[2px] overflow-hidden rounded-lg border border-zinc-800 bg-[#111111] p-2 sm:h-[420px]">
              {array.map((value, index) => {
                const heightPercent = Math.max((value / VALUE_MAX) * 100, 2);
                return (
                  <div
                    key={`${index}-${value}`}
                    className={`flex-1 rounded-t-sm transition-all duration-150 ease-out ${getBarClass(
                      index
                    )}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
            <h2 className="mb-3 text-lg font-medium">{algorithm} Complexity</h2>
            <div className="grid gap-2 text-sm text-gray-300 sm:grid-cols-2">
              <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                Best: <span className="text-gray-100">{complexity.best}</span>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                Average: <span className="text-gray-100">{complexity.average}</span>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                Worst: <span className="text-gray-100">{complexity.worst}</span>
              </div>
              <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
                Space: <span className="text-gray-100">{complexity.space}</span>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
