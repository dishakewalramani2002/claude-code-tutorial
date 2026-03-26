# CSR Simulator — Frontend

React + Vite frontend for the AI-Driven CSR Conflict Resolution Training Simulator. Provides a chat interface, real-time skill feedback panel, and a guided internal workflow portal.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 18 |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| HTTP Client | Axios |

---

## Project Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Top-level routing (landing → mode select → chat)
    ├── index.css             # Tailwind base styles
    └── components/
        ├── ModeSelector.jsx  # Landing page + VC1/VC2 mode selection
        ├── ChatWindow.jsx    # Main session shell — tabs, state, message sending
        ├── MessageBubble.jsx # Individual chat message (customer or CSR)
        ├── FeedbackPanel.jsx # Right sidebar showing skill scores (training only)
        └── WorkflowPortal.jsx# Simulated internal CRM portal with guided workflow
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

> The backend must also be running on port 8000. See `backend/README.md`.

---

## Components

### `App.jsx`
Controls which screen is shown. Three states: `landing` → `mode-select` → `chat`. Passes the selected mode down to `ChatWindow`.

---

### `ModeSelector.jsx`
Landing page with project description and mode selection buttons:
- **Training (VC1)** — Health insurance billing, with feedback
- **Evaluation (VC2)** — Flight cancellation, no feedback shown

---

### `ChatWindow.jsx`
The main session component. Manages:
- Conversation message history
- Sending CSR messages to the backend (`POST /chat`)
- Fetching the customer's opening message on mount (`GET /start/{mode}`)
- Selecting a past CSR message to view its feedback
- Tab state (`Chat` / `Internal Portal`) — both tabs stay mounted so state is never lost on switch
- Portal progress state (`portalStep`, `portalCompleted`) — lifted here so the portal doesn't reset when switching tabs

**Tab label** shows current portal progress: `Internal Portal · Step 3/6`.

---

### `MessageBubble.jsx`
Renders a single message:
- **Customer** (assistant role) — left-aligned, white bubble
- **CSR** (user role) — right-aligned, blue bubble

In training mode, CSR bubbles with feedback are clickable. A small hint (`▲ feedback shown` / `▼ click for feedback`) appears below the bubble. Clicking updates the feedback panel to show that turn's scores.

---

### `FeedbackPanel.jsx`
Right sidebar, visible in training mode (`vc1`) only. Shows the feedback for whichever CSR message is currently selected:

| Field | Description |
|-------|-------------|
| Empathy | Did the CSR acknowledge the customer's emotion? |
| Transparency | Did the CSR explain what they were doing and why? |
| Ownership | Did the CSR commit to a next action? |
| Suggestion | Specific coaching tip for this turn |

Defaults to a prompt to click a blue message when nothing is selected.

---

### `WorkflowPortal.jsx`
A simulated internal CRM portal with a step-by-step guided workflow. The CSR navigates this portal while handling the customer call, mirroring real CSR tool usage.

**VC1 workflow** (Health Insurance Billing):
1. Customer Lookup
2. Billing History — select the disputed bill
3. Claim Detail — review procedure code
4. Policy Review — read coverage rules
5. Determination — select the correct decision
6. Communicate — scripted response to give the customer

**VC2 workflow** (Flight Cancellation):
1. Passenger Lookup
2. Flight Details — review cancellation
3. Rebooking Options — select a flight
4. Compensation Policy — determine eligibility
5. Apply Actions — confirm rebooking + voucher
6. Communicate — scripted response to give the customer

Each step shows:
- A **guidance prompt** (yellow banner) telling the CSR what to do or when to return to the customer
- **Multiple action buttons** — only one correct path leads forward; wrong buttons show an error message
- A **step progress sidebar** showing completed and upcoming steps

Portal state is lifted to `ChatWindow` so progress is never lost when switching to the Chat tab.

---

## Session Flow

```
Landing Page
    ↓  click "Start"
Mode Selection (VC1 or VC2)
    ↓  click mode
Chat Session
    ├── Customer sends opening message (auto-fetched)
    ├── CSR types reply → sent to backend
    ├── Backend returns customer reply + feedback (vc1 only)
    ├── CSR can switch to Internal Portal tab to look up information
    └── CSR switches back to Chat to continue the conversation
```

---

## Modifying the Workflow

The portal workflows are defined as arrays of step objects inside `WorkflowPortal.jsx`. Each step contains:

```js
{
  id: "lookup",
  label: "Customer Lookup",       // shown in sidebar
  prompt: "Ask the customer...",  // guidance banner text
}
```

Each step has a corresponding screen component (e.g. `VC1Lookup`, `VC1Bills`) defined in the same file. To add a step, add an entry to the steps array and create a matching screen component.
