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
  const [arraySize, setArraySize] = useState(40);
  const [speedLevel, setSpeedLevel] = useState(1);
  const [algorithm, setAlgorithm] = useState("Bubble Sort");
  const [array, setArray] = useState(() => buildRandomArray(40));
  const [comparingIndices, setComparingIndices] = useState([]);
  const [swappingIndices, setSwappingIndices] = useState([]);
  const [sortedFlags, setSortedFlags] = useState(() => Array(40).fill(false));
  const [isSorting, setIsSorting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const speedMsRef = useRef(SPEED_OPTIONS[1].ms);
  const isPausedRef = useRef(false);
  const pauseResolverRef = useRef(null);
  const runIdRef = useRef(0);
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

  const resetStateWithNewArray = (size) => {
    runIdRef.current += 1;
    setIsSorting(false);
    setIsPaused(false);
    releasePauseIfNeeded();
    setArray(buildRandomArray(size));
    setSortedFlags(Array(size).fill(false));
    clearTransientHighlights();
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
    if (isSorting) return;
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
    if (!isSorting) return;
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

  const getBarClass = (index) => {
    if (sortedFlags[index]) return "bg-green-500";
    if (swappingIndices.includes(index)) return "bg-red-500";
    if (comparingIndices.includes(index)) return "bg-yellow-400";
    return "bg-blue-500";
  };

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Sorting Algorithm Visualizer
        </h1>
        <p className="text-sm text-gray-400">
          Blue: default, Yellow: comparing, Red: swapping, Green: sorted
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
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

          <label className="flex flex-col gap-2 text-sm lg:col-span-2">
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
        </div>
      </section>

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
  );
}
