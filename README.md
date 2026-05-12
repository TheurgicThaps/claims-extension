# ⬡ Wits MSS Claims Automator

A Chrome extension that automates timesheet claim submissions for Wits MS lab assistants. Paste your work summary, set the date and number of claims, and the extension uses AI to split it into properly formatted claims and submits them all automatically.

---

## Features

- **AI-powered splitting** — paste a paragraph describing your day and it generates correctly formatted claims automatically
- **Auto-submit** — fires all requests directly to the claims portal using your browser session
- **Live preview** — review every claim before submitting
- **Remembers your details** — emp number, manager number, and API key are saved locally
- **Smart team detection** — automatically assigns *Welcoming Team* or *Scientific Research Support* based on context

---

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked** and select the repository folder
5. The extension is now installed

---

## Setup

1. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com) → **Get API Key**
2. Log into [claims.ms.wits.ac.za](https://claims.ms.wits.ac.za)
3. The panel appears in the bottom-right corner of the page
4. Enter your Gemini API key — it will be saved for future sessions

---

## Usage

1. Log into the claims portal
2. Paste your work summary into the text area
3. Set the **date** and **number of claims**
4. Click **Generate Claims** and review the preview
5. Click **Submit All Claims**

---

## Configuration

| Field | Default | Description |
|---|---|---|
| Emp number | `A0012345` | Your employee number |
| Manager number | `A0012345` | Your manager's number |
| Hours per claim | `0.5` | Fixed at 30 min per claim |
| Model | `gemini-2.5-flash-lite` | Gemini model used for generation |

To change the model, edit the URL in `content.js`:
```js
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`
```

---

## File Structure

```
claims-extension/
├── manifest.json   # Extension config and permissions
├── content.js      # Panel UI, Gemini API call, claim submission
├── panel.css       # Floating panel styles
└── README.md
```

---

## Notes

- All claim requests use your browser session cookies, so they authenticate the same way as manual submissions
- A 400ms delay is added between submissions to avoid overloading the server
- Hours are always `0.5` per claim (30 minutes)
- Team is auto-detected: MSB/professor/lecturer work → *Scientific Research Support*, everything else → *Welcoming Team*
