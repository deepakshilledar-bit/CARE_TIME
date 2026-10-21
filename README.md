# CareTime — Smart Medicine Reminder (Frontend Demo)

## Included
- Login/register demo UI
- Upload prescription image/PDF
- Add medicine name, dosage instructions, reminder time, repeat setting, and tablet photo
- Medicine schedule with "Mark as taken"
- Browser alarm and optional browser notification
- Guardian details and a demo no-response alert

## Run locally
1. Extract the ZIP.
2. Open the folder in VS Code.
3. Install the VS Code extension **Live Server** (or use any local static server).
4. Right-click `index.html` and choose **Open with Live Server**.
5. Allow notifications if prompted. Keep the browser tab open and your device awake for reminders.

You can also open `index.html` directly, but a local server is more reliable.

## Important limitations
This is a frontend prototype, not a production healthcare system.
- The demo login stores credentials in `localStorage` and is not secure. Do not use real passwords or sensitive patient information.
- Prescription files and medicine images are stored in browser local storage. Large files can exceed browser storage limits.
- Browser timers work only while the page/session is running; they are not reliable when the browser is closed, the device sleeps, or the operating system suspends the tab.
- The no-response guardian alert is a demo screen only. It does **not** place calls or send SMS.
- Real automatic calls require a backend server, secure user accounts, a scheduled job/queue, and a calling provider (for example, a provider with voice-call APIs). Never put provider API secrets in browser JavaScript.
- A production version should use encrypted access controls, consent, audit logs, secure file storage, and applicable privacy/health-data safeguards.

## Suggested next-step architecture
Frontend: HTML/CSS/JavaScript.
Backend: Node.js + Express.
Database: PostgreSQL or MySQL.
File storage: private object storage.
Alerts: server-side scheduler + voice/SMS provider.
Authentication: hashed passwords and secure sessions.

## Medicine safety
This app only reminds users about schedules they enter. It does not identify pills from photos, interpret prescriptions, or recommend doses. Confirm medicine names, doses, and timings with a qualified healthcare professional.
