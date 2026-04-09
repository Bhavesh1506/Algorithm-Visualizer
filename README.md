# Algorithm Visualizer

**Visualize sorting and pathfinding algorithms in real time**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Open%20App-00C853?style=for-the-badge&logo=vercel)](https://algocanvas-dev.vercel.app/)
![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)
![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)

Live Demo - https://algocanvas-dev.vercel.app/ 

An interactive educational tool that brings algorithms to life through smooth, real-time animation.

## 📸 Screenshots

<img width="1920" height="1080" alt="Screenshot (669)" src="https://github.com/user-attachments/assets/29d8a0f2-d8a6-486e-9d3c-c7cb9c6d84c7" />

<img width="1920" height="1080" alt="Screenshot (670)" src="https://github.com/user-attachments/assets/a96e00c9-893c-436e-9fe1-844a26fb5734" />

<img width="1920" height="1080" alt="Screenshot (671)" src="https://github.com/user-attachments/assets/7562d6cb-3f02-484a-80a9-097a4109a971" />

## ✨ Features

### 📊 Sorting Visualizer
- 5 algorithms: Bubble, Selection, Insertion, Merge, and Quick Sort
- Color-coded states: comparing (`yellow`), swapping (`red`), sorted (`green`)
- Adjustable array size and animation speed
- One-click randomize array
- Per-algorithm time and space complexity display
- Pause and resume support

### 🧭 Pathfinding Visualizer
- 4 algorithms: BFS, DFS, Dijkstra, and A*
- Interactive grid with click/drag wall drawing and erasing
- Draggable start and end nodes
- Weighted nodes support (Dijkstra, A*)
- Animated exploration and shortest-path highlighting
- Completion stats: nodes visited, path length, and time taken
- Shortest-path guarantee indicator per algorithm

### 🏁 Race Mode
- Run any two sorting algorithms side by side
- Both receive the same input array at the same time
- Live swap and comparison counters per algorithm
- Winner banner with total time in milliseconds
- Losing algorithm continues until full completion

### 🧩 Maze Generation
- Recursive Backtracker (DFS-based) generation
- Animated maze carving in real time
- Generated mazes are always solvable
- Instantly test mazes with any pathfinding algorithm

## 🧠 How It Works

This project uses **generator-based algorithm execution** to power animation at the operation level.

- Each algorithm yields control at key steps (comparison, swap, visit, or path update)
- The visualizer consumes each yielded frame to render precise state transitions
- Execution can be paused, resumed, or stepped without losing algorithm state

### Why generators over `setTimeout` loops?
- **State fidelity:** algorithm state remains explicit and resumable at every frame
- **Control:** pause/resume and speed changes are deterministic and easier to manage
- **Scalability:** sorting, pathfinding, race mode, and maze generation share one execution model
- **Cleaner architecture:** UI rendering is decoupled from algorithm progression logic

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Animation Engine | Generator-based execution model |
| Deployment | Vercel |

## 🚀 Getting Started

```bash
git clone https://github.com/Bhavesh1506/Algorithm-Visualizer.git
cd algorithm-visualizer
npm install
npm run dev
```

## 📄 License

This project is licensed under the MIT License.
