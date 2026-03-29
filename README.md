# 🎲 Ten Thousand Dice Game

A web-based implementation of the classic "10,000" dice game, featuring comprehensive scoring rules, an interactive user interface, and real-time multiplayer support.

## 🚀 Overview
Ten Thousand is a fast-paced dice game where players aim to be the first to reach 10,000 points. It involves strategic decision-making, risk management, and a bit of luck. This implementation provides a modern, responsive web experience with both local and online multiplayer modes.

## 🏗️ App Architecture
The application is built with a modular architecture, separating core game logic from the UI and networking layers:

### Core Logic (`src/core/`)
- **`Game.js`**: Central controller managing players, turns, and game phases.
- **`Scorer.js`**: The rule engine that identifies scoring combinations and calculates optimal scores.
- **`Turn.js`**: Manages the state and logic for an individual player's turn.
- **`Dice.js`**: Handles die states (available, selected, locked) and rolling logic.
- **`Player.js`**: Tracks individual player scores, board status, and history.

### UI Components (`src/ui/`)
- **`GameBoard.js`**: Main interface coordinator that manages sub-components.
- **`DiceRenderer.js`**: Interactive 3D-styled dice display with selection logic.
- **`ScoreBoard.js`**: Real-time display of player standings and turn progress.
- **`Controls.js`**: Action buttons (Roll, Bank) and game status messages.
- **`GameLog.js`**: Scrolling history of game actions and scoring events.

### Multiplayer Layer
- **`server/`**: Node.js/Express backend using Socket.io for real-time communication.
- **`RoomManager.js`**: Handles lobby logic and unique 5-letter room codes.
- **`NetworkClient.js`**: Synchronizes local game state with the server.

## 🛠️ Prerequisites & Launch Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Launch Instructions

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ten-thousand
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```
    *The app will be available at `http://localhost:5173`*

4.  **Run the multiplayer backend:**
    ```bash
    npm run server
    ```
    *The backend server will run on `http://localhost:3000`*

5.  **Run tests:**
    ```bash
    npm test
    ```

## 🎮 Game Modes

-   **Local Multiplayer**: Play with friends on the same device (pass-and-play). Add players in the setup screen and take turns rolling.
-   **Online Multiplayer**: Host a game to get a unique 5-letter room code. Share the code with friends so they can join your session from any device.

## 📖 How to Play

### Objective
Be the first player to reach **10,000 points**. Once a player hits the target, a final round is triggered where all other players get one last turn to beat the high score.

### Turn Flow
1.  **Start Turn**: Roll all 6 dice.
2.  **Select Dice**: You must select at least one scoring die (1's, 5's, or combinations) to continue.
3.  **Decision**:
    -   **Bank**: Add your current turn score to your total and end your turn.
    -   **Roll Again**: Roll the remaining dice to increase your turn score.
4.  **Bust**: If a roll contains no scoring dice, you "Bust" and lose all points accumulated during that turn.
5.  **Hot Dice**: If all 6 dice are used in scoring combinations, you get "Hot Dice" and **must** roll all 6 again to continue your turn.

### Getting "On the Board"
To enter the game and start accumulating a total score, you must score at least **750 points** in a single turn. Until this requirement is met, your total score remains at 0.

## 📊 Scoring Rules

### Individual Dice
-   **1's**: 100 points
-   **5's**: 50 points

### Three of a Kind
-   **Three 1's**: 1,000 points
-   **Three 2's**: 200 points
-   **Three 3's**: 300 points
-   **Three 4's**: 400 points
-   **Three 5's**: 500 points
-   **Three 6's**: 600 points
-   *Note: Each additional die beyond three **doubles** the score (e.g., Four 2's = 400, Five 2's = 800).*

### Special Combinations
-   **Straight (1-2-3-4-5-6)**: 1,000 points
-   **Three Pairs**: 1,000 points

## 🧪 Technologies Used
-   **Frontend**: Vite, Vanilla JavaScript (ESM), CSS3
-   **Backend**: Node.js, Express, Socket.io
-   **Testing**: Jest
-   **Icons/Visuals**: CSS-based dice rendering

## 📄 License
This project is licensed under the MIT License - see the `package.json` file for details.

---
*Created as part of the Ten Thousand Dice Game project.*
