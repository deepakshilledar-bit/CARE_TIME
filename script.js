const $ = (id) => document.getElementById(id);
const DB_KEY = "caretime_demo_v1";
let data = loadData();
let authMode = "login";
let activeAlarm = null;
let alarmTimer = null;
let audioContext = null;
let alarmSoundTimer = null;
let toastTimer = null;

function loadData() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || { users: [], session: null, medicines: [], prescriptions: [], guardian: {name:"", phone:""}, fired: {}, taken: {} }; }
  catch { return { users: [], session: null, medicines: [], prescriptions: [], guardian: {name:"", phone:""}, fired: {}, taken: {} }; }
}
function saveData() { localStorage.setItem(DB_KEY, JSON.stringify(data)); }
function safeText(value="") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function toast(message) {
  $("toast").textContent = message; $("toast").classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3000);
}
function setAuthMode(mode) {
  authMode = mode;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === mode));
  $("authTitle").textContent = mode === "login" ? "Welcome back" : "Create your account";
  $("authSubmit").textContent = mode === "login" ? "Login to dashboard" : "Create account";
  $("userName").classList.toggle("hidden", mode === "login");
  $("userName").required = mode === "register";
  $("userPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setAuthMode(t.dataset.tab)));
$("authForm").addEventListener("submit", e => {
  e.preventDefault();
  const email = $("userEmail").value.trim().toLowerCase();
  const password = $("userPassword").value;
  if (authMode === "register") {
    if (data.users.some(u => u.email === email)) return toast("An account with this email already exists.");
    const user = { name: $("userName").value.trim(), email, password };
    data.users.push(user); data.session = email;
    saveData(); showApp(); toast("Account created on this device.");
  } else {
    const user = data.users.find(u => u.email === email && u.password === password);
    if (!user) return toast("Login details not found. Create a demo account first.");
    data.session = email; saveData(); showApp();
  }
});
$("logoutBtn").addEventListener("click", () => { data.session = null; saveData(); showAuth(); });
function currentUser() { return data.users.find(u => u.email === data.session); }
function showAuth() {
  $("authView").classList.remove("hidden"); $("appView").classList.add("hidden"); $("logoutBtn").classList.add("hidden");
}
function showApp() {
  if (!currentUser()) return showAuth();
  $("authView").classList.add("hidden"); $("appView").classList.remove("hidden"); $("logoutBtn").classList.remove("hidden");
  $("welcomeName").textContent = currentUser().name || "there";
  $("guardianName").value = data.guardian.name || ""; $("guardianPhone").value = data.guardian.phone || "";
  renderAll();
}
function todayKey() {
  const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function doseKey(med) { return `${todayKey()}_${med.id}`; }
function renderAll() {
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
  renderMedicines(); renderPrescriptions(); renderStats();
}
function renderStats() {
  const today = todayKey(), active = data.medicines.filter(m => m.repeat === "daily" || m.createdDate === today);
  const taken = active.filter(m => data.taken[`${today}_${m.id}`]).length;
  const upcoming = active.filter(m => !data.taken[`${today}_${m.id}`] && m.time >= currentTime()).sort((a,b)=>a.time.localeCompare(b.time))[0];
  $("medicineCount").textContent = data.medicines.length;
  $("takenCount").textContent = taken;
  $("todayCount").textContent = `${active.length} medicine${active.length===1?"":"s"} today`;
  $("nextReminder").textContent = upcoming ? formatTime(upcoming.time) : (active.length ? "All caught up" : "Not scheduled");
  $("scheduleBadge").textContent = `${data.medicines.length} item${data.medicines.length===1?"":"s"}`;
}
function currentTime() { const d = new Date(); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; }
function formatTime(time) { const [h,m] = time.split(":").map(Number); const d = new Date(); d.setHours(h,m,0,0); return d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"}); }
function renderMedicines() {
  const list = $("medicineList"); list.innerHTML = "";
  $("emptyState").classList.toggle("hidden", data.medicines.length > 0);
  data.medicines.slice().sort((a,b)=>a.time.localeCompare(b.time)).forEach(m => {
    const isTaken = Boolean(data.taken[doseKey(m)]);
    const card = document.createElement("article"); card.className = "medicine-card";
    const photo = m.photo ? `<img src="${m.photo}" alt="${safeText(m.name)} photo">` : "✚";
    card.innerHTML = `<div class="medicine-photo">${photo}</div><div class="medicine-info"><h3>${safeText(m.name)}</h3><p>${safeText(m.dose || "Follow prescription instructions")}</p><span class="time-chip">◷ ${formatTime(m.time)}</span><p>${m.repeat==="daily"?"Every day":"One-time"}${m.notes ? " · "+safeText(m.notes):""}</p>${isTaken?'<div class="taken-label">✓ Marked taken today</div>':""}<div class="medicine-actions"><button class="mini-btn taken" data-action="taken" data-id="${m.id}">${isTaken?"Undo taken":"Mark as taken"}</button><button class="mini-btn delete" data-action="delete" data-id="${m.id}">Delete</button></div></div>`;
    list.appendChild(card);
  });
}
$("medicineList").addEventListener("click", e => {
  const btn = e.target.closest("button[data-action]"); if (!btn) return;
  const med = data.medicines.find(m => m.id === btn.dataset.id); if (!med) return;
  if (btn.dataset.action === "delete") {
    if (!confirm(`Delete reminder for ${med.name}?`)) return;
    data.medicines = data.medicines.filter(m => m.id !== med.id); saveData(); renderAll(); toast("Medicine reminder deleted.");
  } else {
    const key = doseKey(med);
    if (data.taken[key]) delete data.taken[key]; else data.taken[key] = new Date().toISOString();
    saveData(); renderAll(); toast(data.taken[key] ? "Medicine marked as taken." : "Taken status cleared.");
  }
});
function readImage(file, maxWidth=900) {
  return new Promise((resolve,reject) => {
    if (!file || !file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas"); canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
        canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.78));
      };
      img.onerror = () => reject(new Error("Could not process that image."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
$("medicineForm").addEventListener("submit", async e => {
  e.preventDefault();
  const file = $("medPhoto").files[0];
  let photo = "";
  try { if (file) photo = await readImage(file,600); }
  catch(err) { return toast(err.message); }
  const med = { id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()+Math.random())), name: $("medName").value.trim(), dose: $("medDose").value.trim(), time: $("medTime").value, repeat: $("medDays").value, notes: $("medNotes").value.trim(), photo, createdDate: todayKey() };
  if (!med.time) return toast("Please choose a reminder time.");
  data.medicines.push(med); saveData(); e.target.reset(); renderAll(); toast("Medicine reminder saved.");
});
$("prescriptionFile").addEventListener("change", async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    let content = "";
    if (file.type.startsWith("image/")) content = await readImage(file,1200);
    else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      // Browser-only demo stores PDF as a data URL; large PDFs may exceed local storage.
      content = await new Promise((resolve,reject) => { const r = new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(new Error("Could not read PDF.")); r.readAsDataURL(file); });
    } else return toast("Please upload an image or PDF.");
    data.prescriptions.push({id:String(Date.now()), name:file.name, type:file.type, content, date:new Date().toLocaleDateString()});
    saveData(); renderPrescriptions(); toast("Prescription uploaded to this browser.");
  } catch(err) { toast(err.message || "Upload failed. Try a smaller file."); }
  e.target.value = "";
});
function renderPrescriptions() {
  const el = $("prescriptionList");
  if (!data.prescriptions.length) { el.innerHTML = '<p class="muted small">No prescription uploaded yet.</p>'; return; }
  el.innerHTML = data.prescriptions.map(p => `<div class="file-row"><span>▤ ${safeText(p.name)} <span class="muted">· ${safeText(p.date)}</span></span><a href="${p.content}" target="_blank" rel="noopener">Open</a></div>`).join("");
}
$("guardianForm").addEventListener("submit", e => {
  e.preventDefault(); data.guardian = {name:$("guardianName").value.trim(), phone:$("guardianPhone").value.trim()}; saveData(); toast("Guardian details saved.");
});
function startAlarmSound() {
  stopAlarmSound();
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audioContext = new AudioCtx();
    const beep = () => {
      if (!audioContext || audioContext.state === "closed") return;
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type = "sine"; osc.frequency.value = 880;
      gain.gain.value = 0.13; osc.connect(gain); gain.connect(audioContext.destination);
      osc.start(); osc.stop(audioContext.currentTime + 0.22);
    };
    beep(); alarmSoundTimer = setInterval(beep, 700);
  } catch {}
}
function stopAlarmSound() {
  clearInterval(alarmSoundTimer); alarmSoundTimer = null;
  if (audioContext) { audioContext.close().catch(()=>{}); audioContext = null; }
}
function openAlarm(med, snoozed=false) {
  if (activeAlarm) return;
  activeAlarm = {med, snoozed};
  $("alarmMedicine").innerHTML = `<div class="alarm-med-name">${safeText(med.name)}</div><div class="alarm-med-detail">${safeText(med.dose || "Follow prescription instructions")} · ${formatTime(med.time)}</div>`;
  $("alarmMessage").textContent = snoozed ? "Your medicine reminder was snoozed. Please confirm when you're ready." : "Please confirm once you have taken your medicine.";
  $("alarmModal").classList.remove("hidden");
  startAlarmSound();
  if ("Notification" in window && Notification.permission === "granted") {
    try { new Notification("CareTime medicine reminder", {body:`Time for ${med.name} (${med.dose || "follow prescription"}).`}); } catch {}
  }
  clearTimeout(alarmTimer);
  alarmTimer = setTimeout(() => triggerGuardianAlert(med), 60000);
}
function closeAlarm() {
  $("alarmModal").classList.add("hidden"); stopAlarmSound(); clearTimeout(alarmTimer); activeAlarm = null;
}
$("takenBtn").addEventListener("click", () => {
  if (!activeAlarm) return;
  data.taken[doseKey(activeAlarm.med)] = new Date().toISOString(); saveData();
  closeAlarm(); renderAll(); toast("Thanks for confirming. Stay well!");
});
$("snoozeBtn").addEventListener("click", () => {
  if (!activeAlarm) return;
  const med = activeAlarm.med; closeAlarm(); toast("Reminder snoozed for 5 minutes.");
  setTimeout(() => openAlarm(med, true), 5*60*1000);
});
function triggerGuardianAlert(med) {
  if (!activeAlarm) return;
  const guardian = data.guardian || {};
  $("guardianAlertText").textContent = guardian.name && guardian.phone
    ? `No response was recorded for ${med.name}. The configured guardian is ${guardian.name} (${guardian.phone}). In this demo, this is only a visual alert; no call was placed.`
    : `No response was recorded for ${med.name}, but no guardian contact has been saved. Add a guardian name and phone number in the dashboard.`;
  closeAlarm(); $("guardianModal").classList.remove("hidden");
}
$("closeGuardianBtn").addEventListener("click", () => $("guardianModal").classList.add("hidden"));
function checkReminders() {
  if (!data.session || activeAlarm) return;
  const now = new Date(), today = todayKey(), time = currentTime();
  for (const med of data.medicines) {
    if (med.repeat === "once" && med.createdDate !== today) continue;
    const key = `${today}_${med.id}`;
    if (med.time === time && !data.taken[key] && !data.fired[key]) {
      data.fired[key] = true; saveData(); openAlarm(med); renderStats(); break;
    }
  }
}
async function requestNotifications() {
  if ("Notification" in window && Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch {}
  }
}
document.addEventListener("click", e => { if (e.target.closest("#authSubmit")) requestNotifications(); });
setInterval(() => { checkReminders(); if (data.session) renderStats(); }, 15000);
setInterval(() => { $("todayLabel").textContent = new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}); }, 60000);
if (data.session && currentUser()) showApp(); else showAuth();
setAuthMode("login");
