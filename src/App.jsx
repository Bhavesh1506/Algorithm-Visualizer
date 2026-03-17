import { useState } from "react";
import PathfindingVisualizer from "./PathfindingVisualizer";
import SortingVisualizer from "./SortingVisualizer";

function App() {
  const [activeTab, setActiveTab] = useState("sorting");

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-gray-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="flex w-fit gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("sorting")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "sorting"
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-300 hover:bg-zinc-800"
            }`}
          >
            Sorting
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pathfinding")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "pathfinding"
                ? "bg-blue-600 text-white"
                : "bg-transparent text-gray-300 hover:bg-zinc-800"
            }`}
          >
            Pathfinding
          </button>
        </section>

        {activeTab === "sorting" ? <SortingVisualizer /> : <PathfindingVisualizer />}
      </div>
    </main>
  );
}

export default App;
