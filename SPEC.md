# Timetracker - Simple Project Specification

## 🎯 Goal

A **simple, terminal-style timetracker** that lets developers track work hours with minimal fuss. Think `htop` meets time tracking.

## 🎨 Design Philosophy

- **Gruvbox theme** - Dark, easy on the eyes
- **Terminal/ASCII aesthetics** - Clean, minimal, developer-friendly
- **Single page app** - Everything visible at once
- **Keyboard shortcuts** - Fast operation for power users

## ✨ Core Features

### 1. Time Tracking

- **Start/Stop timer** with one key press
- **Current session display** showing duration, description, project
- **Quick project selection** from dropdown

### 2. Time Log

- **Simple list** of completed sessions
- **Basic info**: date, duration, description, project
- **Edit/delete** existing entries

### 3. Projects

- **Simple project names** (no complex hierarchies)
- **Quick add** new projects on the fly

## 🏗️ Tech Stack

- **Frontend**: Vanilla JavaScript + HTML + CSS
- **Backend**: None (localStorage for data)
- **Styling**: Custom CSS with gruvbox colors
- **Deployment**: Single HTML file

## 🎨 Gruvbox Color Palette

```css
/* Dark gruvbox theme */
--bg: #282828;
--bg0: #282828;
--bg1: #3c3836;
--bg2: #504945;
--fg: #ebdbb2;
--red: #cc241d;
--green: #98971a;
--yellow: #d79921;
--blue: #458588;
--purple: #b16286;
--aqua: #689d6a;
--gray: #928374;
```

## 📱 Layout

```
┌─────────────────────────────────────────┐
│  TIMETRACKER                    [12:34] │
├─────────────────────────────────────────┤
│                                         │
│  [▶ START] [⏹ STOP]                   │
│                                         │
│  Project: [dropdown ▼]                 │
│  Description: [________________]       │
│                                         │
│  Current Session: 2h 15m               │
│  Project: Website Redesign             │
│                                         │
├─────────────────────────────────────────┤
│  TODAY'S SESSIONS                      │
│  ┌─────────────────────────────────────┐ │
│  │ 09:00-11:15 | Website Redesign     │ │
│  │ 13:30-15:45 | Bug Fixes            │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## ⌨️ Keyboard Shortcuts

- `Space` - Start/Stop timer
- `n` - New project
- `e` - Edit current session
- `d` - Delete session
- `r` - Refresh view

## 📊 Data Structure

```javascript
// Simple localStorage structure
{
  sessions: [
    {
      id: "123",
      start: "2024-01-15T09:00:00Z",
      end: "2024-01-15T11:15:00Z",
      project: "Website Redesign",
      description: "Homepage layout"
    }
  ],
  projects: ["Website Redesign", "Bug Fixes", "API Development"]
}
```

## 🚀 Development Phases

### Phase 1: Basic Timer

- Start/stop functionality
- Project selection
- Basic session display

### Phase 2: Data Persistence

- localStorage integration
- Session history
- Edit/delete sessions

### Phase 3: Polish

- Keyboard shortcuts
- Gruvbox theme
- Responsive design

## 🎯 Success Criteria

- **Simple**: < 200 lines of code
- **Fast**: Instant response to all actions
- **Useful**: Track time without thinking about the app
- **Beautiful**: Clean gruvbox aesthetics

---

**Keep it simple. Do one thing well.**
