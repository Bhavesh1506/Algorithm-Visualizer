import { useEffect, useMemo, useRef, useState } from "react";

const PATH_ALGORITHMS = ["BFS", "DFS", "Dijkstra", "A*"];
const PATH_ROWS = 20;
const PATH_COLS = 40;
const PATH_START_DEFAULT = { row: 10, col: 8 };
const PATH_END_DEFAULT = { row: 10, col: 31 };

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const toCellKey = (row, col) => `${row}-${col}`;

const createGrid = () =>
  Array.from({ length: PATH_ROWS }, (_, row) =>
    Array.from({ length: PATH_COLS }, (_, col) => ({
      row,
      col,
      isWall: false,
      isWeight: false,
      state: "idle",
    }))
  );

const createWallGrid = () =>
  Array.from({ length: PATH_ROWS }, (_, row) =>
    Array.from({ length: PATH_COLS }, (_, col) => ({
      row,
      col,
      isWall: true,
      isWeight: false,
      state: "idle",
    }))
  );

const isInsideGrid = (row, col) =>
  row >= 0 && row < PATH_ROWS && col >= 0 && col < PATH_COLS;

const getNeighbors = (row, col) =>
  [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([nextRow, nextCol]) => isInsideGrid(nextRow, nextCol));

const reconstructPath = (parents, endKey, startKey) => {
  if (!parents.has(endKey)) return [];
  const path = [];
  let current = endKey;
  while (current) {
    const [row, col] = current.split("-").map(Number);
    path.push({ row, col });
    if (current === startKey) break;
    current = parents.get(current);
  }
  path.reverse();
  return path[0] && toCellKey(path[0].row, path[0].col) === startKey ? path : [];
};

const movementCost = (cell) => (cell.isWeight ? 5 : 1);
const hasWeightedNodes = (grid) => grid.some((row) => row.some((cell) => cell.isWeight));
const manhattan = (a, b) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
const toOddCell = (value, max) => {
  const clamped = Math.min(max - 2, Math.max(1, value));
  return clamped % 2 === 0 ? clamped - 1 : clamped;
};

const findOpenCellInRegion = (grid, rowStart, rowEnd, colStart, colEnd, fallback) => {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      if (!grid[row][col].isWall) return { row, col };
    }
  }
  return fallback;
};

const cloneGrid = (grid) => grid.map((line) => line.map((cell) => ({ ...cell })));

function runBfs(grid, start, end) {
  const startKey = toCellKey(start.row, start.col);
  const endKey = toCellKey(end.row, end.col);
  const queue = [{ row: start.row, col: start.col }];
  const seen = new Set([startKey]);
  const parents = new Map([[startKey, null]]);
  const visitedOrder = [];
  while (queue.length) {
    const current = queue.shift();
    const currentKey = toCellKey(current.row, current.col);
    visitedOrder.push(current);
    if (currentKey === endKey) break;
    for (const [nextRow, nextCol] of getNeighbors(current.row, current.col)) {
      const nextKey = toCellKey(nextRow, nextCol);
      if (seen.has(nextKey)) continue;
      if (grid[nextRow][nextCol].isWall) continue;
      seen.add(nextKey);
      parents.set(nextKey, currentKey);
      queue.push({ row: nextRow, col: nextCol });
    }
  }
  return { visitedOrder, path: reconstructPath(parents, endKey, startKey) };
}

function runDfs(grid, start, end) {
  const startKey = toCellKey(start.row, start.col);
  const endKey = toCellKey(end.row, end.col);
  const stack = [{ row: start.row, col: start.col }];
  const seen = new Set([startKey]);
  const parents = new Map([[startKey, null]]);
  const visitedOrder = [];
  while (stack.length) {
    const current = stack.pop();
    const currentKey = toCellKey(current.row, current.col);
    visitedOrder.push(current);
    if (currentKey === endKey) break;
    const neighbors = getNeighbors(current.row, current.col);
    for (let i = neighbors.length - 1; i >= 0; i -= 1) {
      const [nextRow, nextCol] = neighbors[i];
      const nextKey = toCellKey(nextRow, nextCol);
      if (seen.has(nextKey)) continue;
      if (grid[nextRow][nextCol].isWall) continue;
      seen.add(nextKey);
      parents.set(nextKey, currentKey);
      stack.push({ row: nextRow, col: nextCol });
    }
  }
  return { visitedOrder, path: reconstructPath(parents, endKey, startKey) };
}

function runDijkstra(grid, start, end) {
  const startKey = toCellKey(start.row, start.col);
  const endKey = toCellKey(end.row, end.col);
  const distances = new Map([[startKey, 0]]);
  const parents = new Map([[startKey, null]]);
  const visited = new Set();
  const visitedOrder = [];
  const queue = [{ row: start.row, col: start.col, cost: 0 }];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();
    const currentKey = toCellKey(current.row, current.col);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedOrder.push({ row: current.row, col: current.col });
    if (currentKey === endKey) break;
    for (const [nextRow, nextCol] of getNeighbors(current.row, current.col)) {
      if (grid[nextRow][nextCol].isWall) continue;
      const nextKey = toCellKey(nextRow, nextCol);
      const nextCost =
        (distances.get(currentKey) ?? Number.POSITIVE_INFINITY) +
        movementCost(grid[nextRow][nextCol]);
      if (nextCost < (distances.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        distances.set(nextKey, nextCost);
        parents.set(nextKey, currentKey);
        queue.push({ row: nextRow, col: nextCol, cost: nextCost });
      }
    }
  }
  return { visitedOrder, path: reconstructPath(parents, endKey, startKey) };
}

function runAStar(grid, start, end) {
  const startKey = toCellKey(start.row, start.col);
  const endKey = toCellKey(end.row, end.col);
  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, manhattan(start, end)]]);
  const parents = new Map([[startKey, null]]);
  const visited = new Set();
  const visitedOrder = [];
  const queue = [{ row: start.row, col: start.col, g: 0, f: manhattan(start, end) }];
  while (queue.length) {
    queue.sort((a, b) => a.f - b.f || a.g - b.g);
    const current = queue.shift();
    const currentKey = toCellKey(current.row, current.col);
    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    visitedOrder.push({ row: current.row, col: current.col });
    if (currentKey === endKey) break;
    for (const [nextRow, nextCol] of getNeighbors(current.row, current.col)) {
      if (grid[nextRow][nextCol].isWall) continue;
      const nextKey = toCellKey(nextRow, nextCol);
      const tentativeG =
        (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) +
        movementCost(grid[nextRow][nextCol]);
      if (tentativeG < (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) {
        const nextPoint = { row: nextRow, col: nextCol };
        gScore.set(nextKey, tentativeG);
        fScore.set(nextKey, tentativeG + manhattan(nextPoint, end));
        parents.set(nextKey, currentKey);
        queue.push({ row: nextRow, col: nextCol, g: tentativeG, f: fScore.get(nextKey) });
      }
    }
  }
  return { visitedOrder, path: reconstructPath(parents, endKey, startKey) };
}

export default function PathfindingVisualizer() {
  const [grid, setGrid] = useState(() => createGrid());
  const [algorithm, setAlgorithm] = useState("BFS");
  const [speed, setSpeed] = useState(45);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isGeneratingMaze, setIsGeneratingMaze] = useState(false);
  const [weightedPaintMode, setWeightedPaintMode] = useState(false);
  const [start, setStart] = useState(PATH_START_DEFAULT);
  const [end, setEnd] = useState(PATH_END_DEFAULT);
  const [mouseAction, setMouseAction] = useState(null);
  const [stats, setStats] = useState({
    nodesVisited: 0,
    pathLength: 0,
    timeTakenMs: 0,
    found: false,
  });

  const runIdRef = useRef(0);
  const canUseWeights = algorithm === "Dijkstra" || algorithm === "A*";
  const animationDelay = useMemo(() => Math.max(8, 200 - speed * 2), [speed]);
  const controlsLocked = isAnimating || isGeneratingMaze;

  useEffect(() => {
    if (!canUseWeights) setWeightedPaintMode(false);
  }, [canUseWeights]);

  useEffect(() => {
    const releaseMouse = () => setMouseAction(null);
    window.addEventListener("mouseup", releaseMouse);
    return () => window.removeEventListener("mouseup", releaseMouse);
  }, []);

  const shortestPathGuarantee = useMemo(() => {
    const gridHasWeights = hasWeightedNodes(grid);
    if (algorithm === "Dijkstra") return "Yes";
    if (algorithm === "A*") return "Yes";
    if (algorithm === "BFS") return gridHasWeights ? "No" : "Yes";
    return "No";
  }, [algorithm, grid]);

  const clearSearchVisualsOnly = () => {
    setGrid((prev) =>
      prev.map((line) => line.map((cell) => ({ ...cell, state: "idle" })))
    );
    setStats({ nodesVisited: 0, pathLength: 0, timeTakenMs: 0, found: false });
  };

  const clearBoard = () => {
    runIdRef.current += 1;
    setIsAnimating(false);
    clearSearchVisualsOnly();
  };

  const resetBoard = () => {
    runIdRef.current += 1;
    setIsAnimating(false);
    setGrid(createGrid());
    setStart(PATH_START_DEFAULT);
    setEnd(PATH_END_DEFAULT);
    setStats({ nodesVisited: 0, pathLength: 0, timeTakenMs: 0, found: false });
  };

  const updateCell = (row, col, updater) => {
    setGrid((prev) => {
      const next = prev.map((line) => line.map((cell) => ({ ...cell })));
      next[row][col] = updater(next[row][col]);
      return next;
    });
  };

  const flashCarvedCell = async (localGrid, row, col) => {
    localGrid[row][col] = {
      ...localGrid[row][col],
      isWall: false,
      isWeight: false,
      state: "carving",
    };
    setGrid(cloneGrid(localGrid));
    await delay(animationDelay);
    localGrid[row][col] = { ...localGrid[row][col], state: "idle" };
    setGrid(cloneGrid(localGrid));
  };

  const generateMaze = async () => {
    if (controlsLocked) return;

    runIdRef.current += 1;
    setIsAnimating(false);
    setIsGeneratingMaze(true);
    setWeightedPaintMode(false);
    setMouseAction(null);
    setStats({ nodesVisited: 0, pathLength: 0, timeTakenMs: 0, found: false });

    const localGrid = createWallGrid();
    setGrid(cloneGrid(localGrid));

    const mazeStart = {
      row: toOddCell(start.row, PATH_ROWS),
      col: toOddCell(start.col, PATH_COLS),
    };

    const stack = [mazeStart];
    const visited = new Set([toCellKey(mazeStart.row, mazeStart.col)]);
    await flashCarvedCell(localGrid, mazeStart.row, mazeStart.col);

    const directions = [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ];

    while (stack.length) {
      const current = stack[stack.length - 1];
      const candidates = [];

      for (const [dr, dc] of directions) {
        const nextRow = current.row + dr;
        const nextCol = current.col + dc;
        if (!isInsideGrid(nextRow, nextCol)) continue;
        if (nextRow <= 0 || nextRow >= PATH_ROWS - 1 || nextCol <= 0 || nextCol >= PATH_COLS - 1) {
          continue;
        }
        const key = toCellKey(nextRow, nextCol);
        if (!visited.has(key)) {
          candidates.push({ nextRow, nextCol, betweenRow: current.row + dr / 2, betweenCol: current.col + dc / 2 });
        }
      }

      if (!candidates.length) {
        stack.pop();
        continue;
      }

      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      visited.add(toCellKey(chosen.nextRow, chosen.nextCol));

      await flashCarvedCell(localGrid, chosen.betweenRow, chosen.betweenCol);
      await flashCarvedCell(localGrid, chosen.nextRow, chosen.nextCol);

      stack.push({ row: chosen.nextRow, col: chosen.nextCol });
    }

    const topLeftFallback = { row: 1, col: 1 };
    const bottomRightFallback = { row: PATH_ROWS - 2, col: PATH_COLS - 2 };
    const nextStart = findOpenCellInRegion(
      localGrid,
      0,
      Math.floor(PATH_ROWS / 2),
      0,
      Math.floor(PATH_COLS / 2),
      topLeftFallback
    );
    const nextEnd = findOpenCellInRegion(
      localGrid,
      Math.floor(PATH_ROWS / 2),
      PATH_ROWS - 1,
      Math.floor(PATH_COLS / 2),
      PATH_COLS - 1,
      bottomRightFallback
    );
    const safeEnd =
      nextEnd.row === nextStart.row && nextEnd.col === nextStart.col
        ? findOpenCellInRegion(localGrid, 0, PATH_ROWS - 1, 0, PATH_COLS - 1, bottomRightFallback)
        : nextEnd;

    setStart(nextStart);
    setEnd(safeEnd);
    setGrid(cloneGrid(localGrid));

    setIsGeneratingMaze(false);
  };

  const moveSpecialNode = (type, row, col) => {
    if (type === "start") {
      if (row === end.row && col === end.col) return;
      setStart({ row, col });
    } else {
      if (row === start.row && col === start.col) return;
      setEnd({ row, col });
    }
    updateCell(row, col, (cell) => ({ ...cell, isWall: false, isWeight: false }));
  };

  const paintCell = (row, col, action) => {
    if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) return;
    updateCell(row, col, (cell) => {
      if (action === "drawWall") return { ...cell, isWall: true, isWeight: false };
      if (action === "eraseWall") return { ...cell, isWall: false };
      if (action === "drawWeight") return { ...cell, isWall: false, isWeight: true };
      if (action === "eraseWeight") return { ...cell, isWeight: false };
      return cell;
    });
  };

  const onCellMouseDown = (row, col) => {
    if (controlsLocked) return;
    clearSearchVisualsOnly();
    if (row === start.row && col === start.col) return setMouseAction("moveStart");
    if (row === end.row && col === end.col) return setMouseAction("moveEnd");
    const cell = grid[row][col];
    if (weightedPaintMode && canUseWeights) {
      const action = cell.isWeight ? "eraseWeight" : "drawWeight";
      setMouseAction(action);
      return paintCell(row, col, action);
    }
    const action = cell.isWall ? "eraseWall" : "drawWall";
    setMouseAction(action);
    paintCell(row, col, action);
  };

  const onCellMouseEnter = (row, col) => {
    if (controlsLocked || !mouseAction) return;
    if (mouseAction === "moveStart") return moveSpecialNode("start", row, col);
    if (mouseAction === "moveEnd") return moveSpecialNode("end", row, col);
    paintCell(row, col, mouseAction);
  };

  const animatePathfinding = async (visitedOrder, path, runId) => {
    for (const node of visitedOrder) {
      if (runId !== runIdRef.current) return;
      const isSpecial =
        (node.row === start.row && node.col === start.col) ||
        (node.row === end.row && node.col === end.col);
      if (!isSpecial) updateCell(node.row, node.col, (cell) => ({ ...cell, state: "visited" }));
      await delay(animationDelay);
    }
    for (const node of path) {
      if (runId !== runIdRef.current) return;
      const isSpecial =
        (node.row === start.row && node.col === start.col) ||
        (node.row === end.row && node.col === end.col);
      if (!isSpecial) updateCell(node.row, node.col, (cell) => ({ ...cell, state: "path" }));
      await delay(Math.max(8, Math.floor(animationDelay * 0.75)));
    }
  };

  const runSelectedAlgorithm = () => {
    if (algorithm === "BFS") return runBfs(grid, start, end);
    if (algorithm === "DFS") return runDfs(grid, start, end);
    if (algorithm === "Dijkstra") return runDijkstra(grid, start, end);
    return runAStar(grid, start, end);
  };

  const visualize = async () => {
    if (controlsLocked) return;
    clearBoard();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setIsAnimating(true);
    const t0 = performance.now();
    const result = runSelectedAlgorithm();
    const t1 = performance.now();
    setStats({
      nodesVisited: result.visitedOrder.length,
      pathLength: result.path.length > 0 ? result.path.length - 1 : 0,
      timeTakenMs: Number((t1 - t0).toFixed(2)),
      found: result.path.length > 0,
    });
    await animatePathfinding(result.visitedOrder, result.path, runId);
    if (runId === runIdRef.current) setIsAnimating(false);
  };

  const getCellClass = (cell, row, col) => {
    if (row === start.row && col === start.col) return "bg-green-500";
    if (row === end.row && col === end.col) return "bg-red-500";
    if (cell.state === "carving") return "pathfinding-cell pathfinding-cell--carving";
    if (cell.isWall) return "bg-[#050505]";
    if (cell.state === "path") return "pathfinding-cell pathfinding-cell--path";
    if (cell.state === "visited") return "pathfinding-cell pathfinding-cell--visited";
    if (cell.isWeight) return "bg-orange-500";
    return "bg-zinc-700";
  };

  return (
    <>
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Pathfinding Visualizer</h1>
        <p className="text-sm text-gray-400">
          Drag start/end nodes, draw walls, and visualize BFS / DFS / Dijkstra / A*
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-gray-300">Algorithm</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 outline-none transition focus:border-zinc-500"
              disabled={controlsLocked}
            >
              {PATH_ALGORITHMS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm lg:col-span-2">
            <span className="text-gray-300">Speed: {speed}</span>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="accent-blue-500"
              disabled={controlsLocked}
            />
          </label>

          <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm lg:col-span-2">
            <button
              type="button"
              onClick={() => setWeightedPaintMode((prev) => !prev)}
              disabled={!canUseWeights || controlsLocked}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                weightedPaintMode
                  ? "bg-orange-500 text-zinc-950 hover:bg-orange-400"
                  : "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Weighted Nodes ({weightedPaintMode ? "On" : "Off"})
            </button>
            <span className="text-xs text-gray-400">Available for Dijkstra and A* (weight = 5)</span>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-gray-300">
            Shortest Path Guarantee: <span className="text-gray-100">{shortestPathGuarantee}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generateMaze}
            disabled={controlsLocked}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingMaze ? "Generating Maze..." : "Generate Maze"}
          </button>
          <button
            type="button"
            onClick={visualize}
            disabled={controlsLocked}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Visualize
          </button>
          <button
            type="button"
            onClick={clearBoard}
            disabled={controlsLocked}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Board
          </button>
          <button
            type="button"
            onClick={resetBoard}
            disabled={controlsLocked}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset Board
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="overflow-auto rounded-lg border border-zinc-800 bg-[#101010] p-2">
          <div
            className="grid min-w-[860px] gap-[1px]"
            style={{ gridTemplateColumns: `repeat(${PATH_COLS}, minmax(0, 1fr))` }}
            onMouseLeave={() => setMouseAction(null)}
          >
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <button
                  type="button"
                  key={toCellKey(rowIndex, colIndex)}
                  onMouseDown={() => onCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                  onMouseUp={() => setMouseAction(null)}
                  className={`aspect-square min-h-[16px] rounded-[2px] border border-zinc-900/20 transition-colors duration-100 ${getCellClass(
                    cell,
                    rowIndex,
                    colIndex
                  )}`}
                  aria-label={`cell-${rowIndex}-${colIndex}`}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5">
        <div className="grid gap-2 text-sm text-gray-300 sm:grid-cols-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            Nodes Visited: <span className="text-gray-100">{stats.nodesVisited}</span>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            Path Length: <span className="text-gray-100">{stats.pathLength}</span>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            Time Taken: <span className="text-gray-100">{stats.timeTakenMs} ms</span>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-950/70 px-3 py-2">
            Result: <span className="text-gray-100">{stats.found ? "Path Found" : "No Path"}</span>
          </div>
        </div>
      </section>
    </>
  );
}
