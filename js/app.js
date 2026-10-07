const App = (() => {
  const DAYS = [
    { id: "lunes", short: "Lun", label: "Lunes" },
    { id: "martes", short: "Mar", label: "Martes" },
    { id: "miercoles", short: "Mié", label: "Miércoles" },
    { id: "jueves", short: "Jue", label: "Jueves" },
    { id: "viernes", short: "Vie", label: "Viernes" },
    { id: "sabado", short: "Sáb", label: "Sábado" },
    { id: "domingo", short: "Dom", label: "Domingo" },
  ];
  const WEEKDAYS = DAYS.slice(0, 5);
  const GOALS = [
    { id: "bajar", label: "Bajar grasa" },
    { id: "ganar", label: "Ganar músculo" },
    { id: "mantener", label: "Mantenerme" },
  ];
  const PLANS = ["Básico", "Plus", "Elite"];
  const LEVELS = ["Todos", "Inicial", "Medio"];
  const STATUSES = ["Activo", "Pausa"];

  const ui = {
    view: "home",
    loginError: "",
    search: "",
    routineDay: "lunes",
    courseDay: "lunes",
    courseTab: "mine",
    weightOpen: false,
    weightError: "",
    toast: "",
    sheet: null,
    draft: null,
    formError: "",
    editingId: null,
    stack: [],
    pinChat: false,
    focusChat: false,
  };

  let toastTimer = 0;

  function boot() {
    Store.load();
    const today = todayId();
    ui.courseDay = today;
    ui.routineDay = WEEKDAYS.some((day) => day.id === today) ? today : "lunes";
    const root = document.getElementById("app");
    root.addEventListener("click", onClick);
    root.addEventListener("submit", onSubmit);
    root.addEventListener("input", onInput);
    render();
  }

  function todayId() {
    return ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][new Date().getDay()];
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function initials(name) {
    const parts = String(name || "FM").trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function firstName(name) {
    return String(name || "").trim().split(/\s+/)[0];
  }

  function fixed(value) {
    return (Math.round(Number(value) * 10) / 10).toFixed(1);
  }

  function dayLabel(id) {
    const found = DAYS.find((day) => day.id === id);
    return found ? found.label : id;
  }

  function daysLabel(days) {
    return (days || []).map((id) => DAYS.find((day) => day.id === id)?.short || id).join(" · ");
  }

  function goalLabel(id) {
    return GOALS.find((goal) => goal.id === id)?.label || id;
  }

  function roleLabel(role) {
    if (role === "admin") return "Admin";
    if (role === "empleado") return "Empleado";
    return "Cliente";
  }

  function formatDate(iso) {
    if (!iso) return "hoy";
    const [year, month, day] = iso.split("-");
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return Number(day) + " " + months[Number(month) - 1] + " " + year;
  }

  function endTime(time, duration) {
    const bits = String(time || "00:00").split(":");
    const total = Number(bits[0]) * 60 + Number(bits[1] || 0) + Number(duration || 0);
    const hours = String(Math.floor(total / 60) % 24).padStart(2, "0");
    const mins = String(total % 60).padStart(2, "0");
    return hours + ":" + mins;
  }

  function weightStory(client) {
    const delta = Math.round((client.startWeight - client.currentWeight) * 10) / 10;
    if (delta > 0) return { label: "Has bajado", value: fixed(delta), tone: "down" };
    if (delta < 0) return { label: "Has subido", value: fixed(Math.abs(delta)), tone: "up" };
    return { label: "Te mantienes", value: "0.0", tone: "down" };
  }

  function goalPercent(client) {
    const total = Math.abs(client.startWeight - client.goalWeight);
    const done = Math.abs(client.startWeight - client.currentWeight);
    if (!total) return 100;
    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  }

  function imc(client) {
    const meters = client.height / 100;
    return client.height ? client.currentWeight / (meters * meters) : 0;
  }

  function imcLabel(value) {
    if (value < 18.5) return "Bajo";
    if (value < 25) return "Saludable";
    if (value < 30) return "Sobrepeso";
    return "Alto";
  }

  function coachName(id) {
    return Store.coach(id)?.name || "Sin coach";
  }

  function myCourses(client) {
    return Store.courses().filter((course) => client.courseIds.includes(course.id));
  }

  function nextClass(client) {
    const order = DAYS.map((day) => day.id);
    const start = order.indexOf(todayId());
    const enrolled = myCourses(client);
    for (let step = 0; step < 7; step += 1) {
      const day = order[(start + step) % 7];
      const hits = enrolled
        .filter((course) => course.days.includes(day))
        .sort((a, b) => a.time.localeCompare(b.time));
      if (hits.length) return { day, course: hits[0], isToday: step === 0 };
    }
    return null;
  }

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + paths + "</svg>";
  }

  const icons = {
    home: svg('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>'),
    chart: svg('<path d="M4 19h16"/><path d="M7 16v-5"/><path d="M12 16V8"/><path d="M17 16v-8"/>'),
    calendar: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
    dumbbell: svg('<path d="M6 9v6M18 9v6M3 10v4M21 10v4M6 12h12"/>'),
    chat: svg('<path d="M6 17.5 3 20V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8z"/>'),
    users: svg('<path d="M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="7" r="3"/><path d="M20 20v-1a3.5 3.5 0 0 0-2.5-3.35"/><path d="M16 4.2a3 3 0 0 1 0 5.6"/>'),
    whistle: svg('<circle cx="8" cy="14" r="4"/><path d="M12 14h8l-2-3h-3"/><path d="M8 6v2"/>'),
    team: svg('<path d="M8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zM16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3z"/><path d="M3 19a5 5 0 0 1 10 0M13 19a5 5 0 0 1 8 0"/>'),
    back: svg('<path d="M15 5 8 12l7 7"/>'),
    user: svg('<circle cx="12" cy="8" r="3"/><path d="M5 19a7 7 0 0 1 14 0"/>'),
    eye: svg('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>'),
    eyeOff: svg('<path d="M3 3l18 18"/><path d="M10.5 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 3.8"/><path d="M6.1 6.1C3.5 8 2 12 2 12s3.5 6 10 6c1.3 0 2.5-.2 3.6-.7"/><path d="M9.9 9.9a2.5 2.5 0 0 0 3.2 3.2"/>'),
  };

  function showToast(message) {
    ui.toast = message;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      ui.toast = "";
      render();
    }, 2200);
  }

  function go(view) {
    ui.stack = [];
    ui.view = view;
    ui.editingId = null;
    ui.sheet = null;
    ui.formError = "";
    ui.draft = null;
    if (view === "coach") ui.pinChat = true;
    render();
  }

  function push(view, editingId) {
    ui.stack.push({ view: ui.view, editingId: ui.editingId });
    ui.view = view;
    if (editingId !== undefined) ui.editingId = editingId;
    ui.draft = null;
    ui.formError = "";
    ui.sheet = null;
    render();
  }

  function pop() {
    const prev = ui.stack.pop();
    ui.draft = null;
    ui.formError = "";
    ui.sheet = null;
    if (!prev) {
      ui.view = "home";
      ui.editingId = null;
    } else {
      ui.view = prev.view;
      ui.editingId = prev.editingId;
    }
    render();
  }

  function homeFor() {
    ui.stack = [];
    ui.view = "home";
    ui.editingId = null;
  }

  function captureFocus() {
    const active = document.activeElement;
    const screen = document.querySelector(".screen");
    return {
      screen: document.querySelector("[data-screen]")?.dataset.screen || "",
      scroll: screen ? screen.scrollTop : 0,
      id: active && active.dataset.keepfocus ? active.id : "",
      sel: active ? active.selectionStart : null,
    };
  }

  function restoreFocus(snapshot) {
    const screen = document.querySelector(".screen");
    if (screen && snapshot.screen === ui.view) screen.scrollTop = snapshot.scroll;
    if (snapshot.id) {
      const el = document.getElementById(snapshot.id);
      if (el) {
        el.focus();
        if (typeof snapshot.sel === "number" && el.setSelectionRange) {
          try { el.setSelectionRange(snapshot.sel, snapshot.sel); } catch (err) { /* algunos inputs no lo permiten */ }
        }
      }
    }
    if (ui.focusChat) {
      const chat = document.getElementById("chat-input");
      if (chat) chat.focus();
      ui.focusChat = false;
    }
    if (ui.pinChat) {
      const log = document.querySelector(".chat-log");
      if (log) log.scrollTop = log.scrollHeight;
      ui.pinChat = false;
    }
  }

  function render() {
    const root = document.getElementById("app");
    const focus = captureFocus();
    const session = Store.session();
    let html = "";
    if (!session) html = renderLogin();
    else if (session.role === "cliente") html = renderClient(session);
    else html = renderStaff(session);
    if (ui.sheet) html += renderSheet();
    if (ui.toast) html += '<div class="toast">' + esc(ui.toast) + "</div>";
    root.innerHTML = html;
    restoreFocus(focus);
  }

  function renderLogin() {
    return (
      '<main class="screen login" data-screen="login">' +
      '<div class="login-brand"><div class="mark">' + icons.dumbbell + "</div>" +
      '<h2>Fit<span>Mate</span></h2></div>' +
      '<form id="login-form" data-action="login" class="card">' +
      '<label class="field">Usuario<input name="username" autocomplete="username" placeholder="Usuario"></label>' +
      '<label class="field">Contraseña<div class="pass-row"><input id="login-pass" name="password" type="password" autocomplete="current-password" placeholder="Contraseña">' +
      '<button type="button" class="eye-btn" data-action="toggle-pass" aria-label="Mostrar contraseña">' + icons.eye + "</button></div></label>" +
      (ui.loginError ? '<p class="login-error">' + esc(ui.loginError) + "</p>" : "") +
      '<button class="primary" type="submit">Entrar</button></form>' +
      "</main>"
    );
  }

  function topbar(options) {
    const left = options.back
      ? '<button type="button" class="icon-btn" data-action="back" aria-label="Volver">' + icons.back + "</button>"
      : '<div class="brand">Fit<span>Mate</span></div>';
    const center = options.title
      ? "<h1>" + esc(options.title) + "</h1>"
      : options.pill
        ? '<div style="text-align:center"><span class="role-pill">' + esc(options.pill) + "</span></div>"
        : "<span></span>";
    let right = "<span></span>";
    if (options.action) {
      right = '<button type="button" class="text-btn" data-action="' + options.action + '">' + esc(options.actionLabel) + "</button>";
    } else if (options.avatar) {
      right = '<button type="button" class="avatar-btn" data-action="open-profile" aria-label="Perfil">' + esc(options.avatar) + "</button>";
    }
    return '<header class="top">' + left + center + right + "</header>";
  }

  function tabbar(items, current) {
    const buttons = items.map((item) => {
      const on = item.id === current ? " on" : "";
      return '<button type="button" class="tab' + on + '" data-action="go" data-view="' + item.id + '">' +
        icons[item.icon] + "<span>" + item.label + "</span></button>";
    }).join("");
    return '<nav class="tabbar">' + buttons + "</nav>";
  }

  function clientTabs(current) {
    const map = { home: "home", progress: "progress", courses: "courses", routine: "routine", coach: "coach" };
    return tabbar([
      { id: "home", label: "Inicio", icon: "home" },
      { id: "progress", label: "Progreso", icon: "chart" },
      { id: "courses", label: "Cursos", icon: "calendar" },
      { id: "routine", label: "Rutina", icon: "dumbbell" },
      { id: "coach", label: "Coach", icon: "chat" },
    ], map[current] || "");
  }

  function staffTabs(current, isAdmin) {
    const items = [
      { id: "home", label: "Inicio", icon: "home" },
      { id: "clients", label: "Clientes", icon: "users" },
      { id: "courses", label: "Cursos", icon: "calendar" },
      { id: "coaches", label: "Coaches", icon: "whistle" },
    ];
    if (isAdmin) items.push({ id: "team", label: "Equipo", icon: "team" });
    const active = ["client-form", "client-detail"].includes(current)
      ? "clients"
      : ["course-form"].includes(current)
        ? "courses"
        : ["coach-form"].includes(current)
          ? "coaches"
          : current === "employee-form"
            ? "team"
            : current;
    return tabbar(items, active);
  }

  function renderClient(session) {
    const client = Store.clientOf(session);
    if (!client) {
      return topbar({ title: "FitMate", avatar: initials(session.name) }) +
        '<main class="screen" data-screen="missing"><p class="empty">No encontramos tu ficha de cliente.</p></main>';
    }
    const hideNav = ui.view === "profile";
    let body = "";
    if (ui.view === "progress") body = renderProgress(client);
    else if (ui.view === "courses") body = renderMyCourses(client);
    else if (ui.view === "routine") body = renderRoutine(client);
    else if (ui.view === "coach") body = renderCoach(client);
    else if (ui.view === "profile") body = renderProfile(session, client);
    else body = renderClientHome(client);
    const header = ui.view === "profile"
      ? topbar({ back: true, title: "Mi perfil" })
      : topbar({ avatar: initials(client.name) });
    return header + body + (hideNav ? "" : clientTabs(ui.view));
  }

  function renderClientHome(client) {
    const story = weightStory(client);
    const upcoming = nextClass(client);
    const todayRoutine = client.routine[todayId()];
    const water = Store.waterCount(client);
    const glasses = Array.from({ length: 8 }, (_, index) => {
      const n = index + 1;
      return '<button type="button" class="glass' + (n <= water ? " on" : "") + '" data-action="water" data-n="' + n + '" aria-label="' + n + ' vasos"></button>';
    }).join("");
    const visit = Store.checkedInToday(client)
      ? '<button type="button" class="ghost" disabled>Visita de hoy lista</button>'
      : '<button type="button" class="primary" data-action="check-in">Registrar visita</button>';
    const pause = client.status === "Pausa"
      ? '<p class="login-error">Tu plan está en pausa. Pasa por recepción cuando quieras reactivarlo.</p>'
      : "";
    const next = upcoming
      ? '<article class="class-card"><div class="class-time"><strong>' + esc(upcoming.course.time) + "</strong><span>" +
        esc(upcoming.course.duration) + ' min</span></div><div><p class="kicker">' +
        (upcoming.isToday ? "Clase de hoy" : dayLabel(upcoming.day)) + "</p><h3>" + esc(upcoming.course.name) +
        "</h3><p>" + esc(coachName(upcoming.course.coachId)) + " · " + esc(upcoming.course.room) + "</p></div></article>"
      : '<p class="empty">Aún no tienes clases asignadas.</p>';

    return (
      '<main class="screen" data-screen="home">' +
      "<p class=\"kicker\">" + esc(client.plan) + " · racha " + client.streak + " días</p>" +
      '<h2 class="hello">Hola, <span>' + esc(firstName(client.name)) + "</span></h2>" +
      pause +
      '<section class="hero"><div><p class="kicker">' + story.label + '</p><h3>' + story.value + "<small>kg</small></h3>" +
      "<p class=\"muted\">Empezaste en " + fixed(client.startWeight) + " kg · ahora " + fixed(client.currentWeight) + " kg</p></div>" +
      '<div class="ring" style="--p:' + goalPercent(client) + '"><span>' + goalPercent(client) + "%</span></div></section>" +
      '<div class="split"><div class="mini"><span>Grasa</span><b>' + fixed(client.fatPercent) + '%</b></div>' +
      '<div class="mini"><span>Músculo</span><b>' + fixed(client.musclePercent) + "%</b></div></div>" +
      '<section class="day-card mt"><p class="kicker">Hoy en tu rutina</p><h3>' +
      esc(todayRoutine ? todayRoutine.title : "Descanso") + "</h3><p>" +
      esc(todayRoutine ? todayRoutine.note : "Sábado y domingo puedes caminar suave o recuperar.") +
      '</p><button type="button" class="ghost" data-action="go" data-view="routine">Ver rutina de la semana</button></section>' +
      '<p class="section-label mt">Próxima clase</p>' + next +
      '<section class="tip"><p class="kicker">FitMate Coach</p><p>' + esc(FitCoach.tip(client)) + "</p>" +
      '<button type="button" class="primary" data-action="go" data-view="coach">Pedir un tip</button></section>' +
      '<section class="card"><div class="row-between"><strong>Agua de hoy</strong><span class="muted">' + water + " / 8</span></div>" +
      '<div class="glasses">' + glasses + "</div></section>" +
      '<section class="card">' + visit + "</section></main>"
    );
  }

  function renderProgress(client) {
    const story = weightStory(client);
    const fatDelta = Math.round((client.startFat - client.fatPercent) * 10) / 10;
    const muscleDelta = Math.round((client.musclePercent - client.startMuscle) * 10) / 10;
    const values = client.weekly.length ? client.weekly : [client.currentWeight];
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const span = Math.max(max - min, 0.4);
    const bars = values.map((value, index) => {
      const height = 22 + ((value - min) / span) * 78;
      const now = index === values.length - 1 ? " now" : "";
      return '<div class="col"><div class="bar' + now + '" style="height:' + height + '%"></div></div>';
    }).join("");
    const score = imc(client);

    return (
      '<main class="screen" data-screen="progress">' +
      '<p class="kicker">Desde el ' + formatDate(client.startDate) + "</p>" +
      '<h2 class="hello">' + story.label + "</h2>" +
      '<section class="hero"><div><h3>' + story.value + "<small>kg</small></h3>" +
      "<p class=\"muted\">Meta " + fixed(client.goalWeight) + " kg · " + esc(goalLabel(client.goal)) + "</p></div>" +
      '<div class="ring" style="--p:' + goalPercent(client) + '"><span>' + goalPercent(client) + "%</span></div></section>" +
      '<div class="metric-row"><div class="mini"><span>Empezaste</span><b>' + fixed(client.startWeight) + ' kg</b></div>' +
      '<div class="mini"><span>Ahora</span><b>' + fixed(client.currentWeight) + ' kg</b></div>' +
      '<div class="mini"><span>Meta</span><b>' + fixed(client.goalWeight) + " kg</b></div></div>" +
      '<section class="card"><div class="row-between"><strong>Grasa</strong><span class="delta">' +
      (fatDelta > 0 ? "−" : fatDelta < 0 ? "+" : "") + fixed(Math.abs(fatDelta)) + " pts</span></div>" +
      "<p class=\"muted\">Inicio " + fixed(client.startFat) + "% · ahora " + fixed(client.fatPercent) + "%</p>" +
      '<div class="bar-track"><i style="width:' + Math.min(100, client.fatPercent * 2) + '%"></i></div>' +
      '<div class="row-between mt"><strong>Músculo</strong><span class="delta">' +
      (muscleDelta >= 0 ? "+" : "−") + fixed(Math.abs(muscleDelta)) + " pts</span></div>" +
      "<p class=\"muted\">Inicio " + fixed(client.startMuscle) + "% · ahora " + fixed(client.musclePercent) + "%</p>" +
      '<div class="bar-track"><i style="width:' + Math.min(100, client.musclePercent * 2) + '%"></i></div></section>' +
      '<section class="card"><p class="kicker">Últimas semanas</p><div class="chart">' + bars + "</div>" +
      '<div class="chart-labels"><span>' + fixed(values[0]) + " kg</span><span>Hoy " + fixed(values[values.length - 1]) + " kg</span></div></section>" +
      renderWeightForm(client) +
      '<div class="split"><div class="mini"><span>Estatura</span><b>' + Math.round(client.height) + ' cm</b></div>' +
      '<div class="mini"><span>IMC</span><b>' + score.toFixed(1) + "</b><span>" + imcLabel(score) + "</span></div></div></main>"
    );
  }

  function renderWeightForm(client) {
    if (!ui.weightOpen) {
      return '<button type="button" class="primary mt" data-action="open-weight">Registrar progreso</button>';
    }
    return (
      '<form class="card" data-action="save-weight">' +
      (ui.weightError ? '<p class="form-error">' + esc(ui.weightError) + "</p>" : "") +
      '<label class="field">Nuevo peso (kg)<input name="weight" inputmode="decimal" required placeholder="' +
      fixed(client.currentWeight) + '"></label>' +
      '<button class="primary" type="submit">Guardar peso</button>' +
      '<button type="button" class="ghost mt" data-action="close-weight">Cancelar</button></form>'
    );
  }

  function renderMyCourses(client) {
    const tabs = '<div class="day-strip course-tabs">' +
      '<button type="button" class="pill' + (ui.courseTab === "mine" ? " on" : "") + '" data-action="course-tab" data-tab="mine">Mis cursos</button>' +
      '<button type="button" class="pill' + (ui.courseTab === "all" ? " on" : "") + '" data-action="course-tab" data-tab="all">Todos</button></div>';
    const body = ui.courseTab === "all" ? renderAllCourses(client) : renderMineCourses(client);
    return '<main class="screen" data-screen="courses">' + tabs + body + "</main>";
  }

  function renderMineCourses(client) {
    const mine = myCourses(client);
    const strip = DAYS.map((day) => {
      const on = day.id === ui.courseDay ? " on" : "";
      return '<button type="button" class="pill' + on + '" data-action="set-day" data-which="courses" data-day="' + day.id + '">' + day.short + "</button>";
    }).join("");
    const todayList = mine
      .filter((course) => course.days.includes(ui.courseDay))
      .sort((a, b) => a.time.localeCompare(b.time));
    const cards = todayList.length
      ? todayList.map(renderClassCard).join("")
      : '<p class="empty">Este día no tienes clase. Revisa otro o descansa.</p>';
    const week = mine.map((course) => {
      return '<article class="class-card"><div class="class-time"><strong>' + esc(course.time) + "</strong><span>" +
        esc(daysLabel(course.days)) + "</span></div><div><h3>" + esc(course.name) + "</h3><p>" +
        esc(coachName(course.coachId)) + " · " + esc(course.room) + " · " + esc(course.level) + "</p></div></article>";
    }).join("") || '<p class="empty">Aún no estás inscrito. Revisa Todos.</p>';

    return (
      '<h2 class="hello">Tu semana</h2>' +
      '<div class="day-strip">' + strip + "</div>" + cards +
      '<p class="section-label mt">Tus clases</p>' + week
    );
  }

  function renderAllCourses(client) {
    const order = DAYS.map((day) => day.id);
    const list = Store.courses().slice().sort((a, b) => {
      const dayA = order.indexOf(a.days[0]);
      const dayB = order.indexOf(b.days[0]);
      if (dayA !== dayB) return dayA - dayB;
      return a.time.localeCompare(b.time);
    });
    const cards = list.map((course) => {
      const used = Store.enrolledCount(course.id);
      const cap = Math.min(20, course.spots || 20);
      const joined = client.courseIds.includes(course.id);
      const full = used >= cap;
      let button = '<button type="button" class="primary enroll" data-action="enroll" data-id="' + course.id + '">Inscribirme</button>';
      if (joined) button = '<button type="button" class="ghost enroll" disabled>Inscrito</button>';
      else if (full) button = '<button type="button" class="ghost enroll" disabled>Cupo lleno</button>';
      return (
        '<article class="class-card catalog"><div class="class-time"><strong>' + esc(course.time) + "</strong><span>" +
        course.duration + ' min</span></div><div><h3>' + esc(course.name) + "</h3><p>" +
        esc(daysLabel(course.days)) + " · " + esc(coachName(course.coachId)) + "</p><p>" +
        esc(course.room) + " · " + used + "/" + cap + " personas</p>" + button + "</div></article>"
      );
    }).join("");
    return '<h2 class="hello">Horario</h2><p class="muted">Cada clase acepta hasta 20 personas.</p>' + cards;
  }

  function renderClassCard(course) {
    return (
      '<article class="class-card"><div class="class-time"><strong>' + esc(course.time) + "</strong><span>" +
      course.duration + " min</span></div><div><h3>" + esc(course.name) + "</h3><p>" +
      esc(coachName(course.coachId)) + " · " + esc(course.room) + "</p><p>" +
      esc(daysLabel(course.days)) + " · " + esc(course.level) + " · hasta " + esc(endTime(course.time, course.duration)) + "</p></div></article>"
    );
  }

  function renderRoutine(client) {
    const strip = WEEKDAYS.map((day) => {
      const on = day.id === ui.routineDay ? " on" : "";
      return '<button type="button" class="pill' + on + '" data-action="set-day" data-which="routine" data-day="' + day.id + '">' + day.short + "</button>";
    }).join("");
    const plan = client.routine[ui.routineDay];
    const exercises = plan.exercises.map((item, index) => {
      const done = Store.exerciseDone(client, ui.routineDay, index);
      return '<button type="button" class="exercise' + (done ? " done" : "") + '" data-action="toggle-exercise" data-day="' +
        ui.routineDay + '" data-index="' + index + '"><span class="box">' + (done ? "✓" : "") + "</span><span><strong>" +
        esc(item.name) + "</strong><small class=\"muted\">" + item.sets + " × " + esc(item.reps) + " · descanso " + esc(item.rest) + "</small></span></button>";
    }).join("");
    const doneCount = plan.exercises.filter((_, index) => Store.exerciseDone(client, ui.routineDay, index)).length;

    return (
      '<main class="screen" data-screen="routine"><p class="kicker">Lunes a viernes</p><h2 class="hello">Mi rutina</h2>' +
      '<div class="day-strip">' + strip + "</div>" +
      '<section class="day-card"><p class="kicker">' + esc(dayLabel(ui.routineDay)) + " · " + doneCount + "/" + plan.exercises.length + "</p>" +
      "<h3>" + esc(plan.title) + "</h3><p>" + esc(plan.note) + "</p>" + exercises + "</section>" +
      '<p class="fine">Sábado y domingo son descanso o una caminata suave. La rutina se adapta a tu objetivo: ' + esc(goalLabel(client.goal)) + ".</p></main>"
    );
  }

  function renderCoach(client) {
    Store.ensureWelcome(client.id, FitCoach.welcome(client));
    const prompts = ["¿Qué como hoy?", "Proteína", "Cena ligera", "Bajar grasa", "Hidrátate"];
    const chips = prompts.map((text) => {
      return '<button type="button" class="pill" data-action="ask" data-text="' + esc(text) + '">' + esc(text) + "</button>";
    }).join("");
    const bubbles = Store.messages(client.id).map((message) => {
      const mine = message.from === "me";
      return '<div class="bubble ' + (mine ? "me" : "coach") + '"><span class="who">' +
        (mine ? "Tú" : "FitMate Coach") + "</span>" + esc(message.text) + "</div>";
    }).join("");
    return (
      '<main class="screen chat-screen" data-screen="coach"><div class="chat-log">' + bubbles + "</div>" +
      '<div class="suggest">' + chips + "</div>" +
      '<form class="composer" data-action="send-chat"><input id="chat-input" name="text" placeholder="Pregúntale a FitMate" autocomplete="off">' +
      '<button class="primary" type="submit">Enviar</button></form></main>'
    );
  }

  function renderProfile(session, client) {
    const lines = client
      ? "<p><strong>" + esc(client.name) + "</strong></p><p class=\"muted\">" + esc(client.plan) + " · " + esc(goalLabel(client.goal)) +
        "<br>Miembro desde " + formatDate(client.startDate) + "<br>" + esc(client.email || "Sin correo") + "</p>"
      : "<p><strong>" + esc(session.name) + "</strong></p><p class=\"muted\">" + roleLabel(session.role) +
        (session.title ? " · " + esc(session.title) : "") + "</p>";
    return (
      '<main class="screen" data-screen="profile"><div class="card">' + lines +
      "<p class=\"muted\">Usuario " + esc(session.username) + "</p></div>" +
      '<div class="stack mt"><button type="button" class="ghost" data-action="reset-demo">Restaurar datos de demostración</button>' +
      '<button type="button" class="danger" data-action="logout">Cerrar sesión</button></div>' +
      '<p class="fine">Restaurar vuelve a los perfiles originales de esta demo, incluido Andrick / 130306.</p></main>'
    );
  }

  function renderStaff(session) {
    const isAdmin = session.role === "admin";
    if (!isAdmin && (ui.view === "team" || ui.view === "employee-form")) ui.view = "home";
    const formViews = ["client-form", "course-form", "coach-form", "employee-form", "profile", "client-detail"];
    let header = topbar({ avatar: initials(session.name), pill: roleLabel(session.role) });
    let body = "";
    if (ui.view === "clients") {
      header = topbar({ title: "Clientes", action: "new-client", actionLabel: "Nuevo", avatar: false });
      body = renderClientList();
    } else if (ui.view === "client-form") {
      header = topbar({ back: true, title: ui.editingId ? "Modificar cliente" : "Registrar cliente" });
      body = renderClientForm();
    } else if (ui.view === "client-detail") {
      header = topbar({ back: true, title: "Cliente" });
      body = renderClientDetail();
    } else if (ui.view === "courses") {
      header = topbar({ title: "Cursos", action: "new-course", actionLabel: "Nuevo" });
      body = renderCourseAdmin();
    } else if (ui.view === "course-form") {
      header = topbar({ back: true, title: ui.editingId ? "Modificar curso" : "Nuevo curso" });
      body = renderCourseForm();
    } else if (ui.view === "coaches") {
      header = topbar({ title: "Coaches", action: "new-coach", actionLabel: "Nuevo" });
      body = renderCoachAdmin();
    } else if (ui.view === "coach-form") {
      header = topbar({ back: true, title: ui.editingId ? "Modificar coach" : "Nuevo coach" });
      body = renderCoachForm();
    } else if (ui.view === "team") {
      header = topbar({ title: "Equipo", action: "new-employee", actionLabel: "Nuevo" });
      body = renderTeam();
    } else if (ui.view === "employee-form") {
      header = topbar({ back: true, title: ui.editingId ? "Modificar empleado" : "Nuevo empleado" });
      body = renderEmployeeForm();
    } else if (ui.view === "profile") {
      header = topbar({ back: true, title: "Mi perfil" });
      body = renderProfile(session, null);
    } else {
      body = renderStaffHome(session);
    }
    const showNav = !formViews.includes(ui.view);
    return header + body + (showNav ? staffTabs(ui.view, isAdmin) : "");
  }

  function renderStaffHome(session) {
    const people = Store.clients();
    const todayCourses = Store.courses()
      .filter((course) => course.days.includes(todayId()))
      .sort((a, b) => a.time.localeCompare(b.time));
    const query = foldText(ui.search);
    const visible = people.filter((person) => {
      if (!query) return true;
      return foldText(person.name + " " + person.plan + " " + person.goal).includes(query);
    });
    return (
      '<main class="screen" data-screen="home"><p class="kicker">FitMate Centro</p>' +
      '<h2 class="hello">Hola, <span>' + esc(firstName(session.name)) + "</span></h2>" +
      "<p class=\"muted\">" + esc(session.title || roleLabel(session.role)) + "</p>" +
      '<div class="stats"><div class="stat"><span>Clientes</span><b>' + people.length + "</b></div>" +
      '<div class="stat"><span>Clases hoy</span><b>' + todayCourses.length + "</b></div>" +
      '<div class="stat"><span>Coaches</span><b>' + Store.coaches().length + "</b></div>" +
      '<div class="stat"><span>Activos</span><b>' + people.filter((person) => person.status === "Activo").length + "</b></div></div>" +
      '<div class="inline-actions"><button type="button" class="edit" data-action="new-client">Registrar cliente</button>' +
      '<button type="button" class="edit" data-action="go" data-view="courses">Cursos</button></div>' +
      '<label class="field search">Buscar cliente<input id="search" data-keepfocus="1" value="' + esc(ui.search) + '" placeholder="Nombre o plan"></label>' +
      (visible.length ? visible.map(renderPersonCard).join("") : '<p class="empty">Nadie coincide con esa búsqueda.</p>') +
      '<p class="section-label mt">Clases de hoy</p>' +
      (todayCourses.map(renderStaffCourse).join("") || '<p class="empty">Hoy no hay clases en el horario.</p>') +
      "</main>"
    );
  }

  function renderPersonCard(person) {
    const story = weightStory(person);
    const change = story.value === "0.0" ? "se mantiene" : (story.tone === "up" ? "subió " : "bajó ") + story.value + " kg";
    return (
      '<article class="person"><button type="button" class="person-main" data-action="open-client" data-id="' + person.id + '">' +
      '<span class="avatar">' + esc(initials(person.name)) + "</span><span><h3>" + esc(person.name) + "</h3>" +
      "<p class=\"muted\">" + esc(person.plan) + " · " + fixed(person.currentWeight) + " kg · " + change + "</p></span></button><div class=\"person-actions\">" +
      '<button type="button" class="edit" data-action="edit-client" data-id="' + person.id + '">Modificar</button>' +
      '<button type="button" class="remove" data-action="ask-delete-client" data-id="' + person.id + '">Eliminar</button></div></article>'
    );
  }

  function renderClientList() {
    const query = foldText(ui.search);
    const visible = Store.clients().filter((person) => foldText(person.name + " " + person.plan).includes(query));
    return (
      '<main class="screen" data-screen="clients"><label class="field search">Buscar<input id="search" data-keepfocus="1" value="' +
      esc(ui.search) + '" placeholder="Nombre"></label>' +
      (visible.map(renderPersonCard).join("") || '<p class="empty">No hay clientes con ese nombre.</p>') + "</main>"
    );
  }

  function renderClientDetail() {
    const person = Store.client(ui.editingId);
    if (!person) return '<main class="screen"><p class="empty">Ese cliente ya no está.</p></main>';
    const account = Store.userById(person.userId);
    const courses = myCourses(person).map((course) => "<li>" + esc(course.name) + " · " + esc(daysLabel(course.days)) + " · " + esc(course.time) + "</li>").join("");
    const story = weightStory(person);
    return (
      '<main class="screen" data-screen="client-detail"><div class="card"><h2 style="margin:0">' + esc(person.name) + "</h2>" +
      "<p class=\"muted\">" + esc(person.plan) + " · " + esc(person.status) + " · " + esc(goalLabel(person.goal)) + "</p>" +
      "<p class=\"muted\">Usuario " + esc(account ? account.username : "—") + "<br>" + esc(person.email || "Sin correo") +
      "<br>" + esc(person.phone || "Sin teléfono") + "</p></div>" +
      '<div class="metric-row"><div class="mini"><span>Inicio</span><b>' + fixed(person.startWeight) + ' kg</b></div>' +
      '<div class="mini"><span>Actual</span><b>' + fixed(person.currentWeight) + ' kg</b></div>' +
      '<div class="mini"><span>' + esc(story.label) + "</span><b>" + story.value + " kg</b></div></div>" +
      '<div class="split"><div class="mini"><span>Grasa</span><b>' + fixed(person.fatPercent) + '%</b></div>' +
      '<div class="mini"><span>Músculo</span><b>' + fixed(person.musclePercent) + "%</b></div></div>" +
      "<div class=\"card\"><strong>Cursos</strong><ul>" + (courses || "<li>Sin clases</li>") + "</ul></div>" +
      '<div class="stack"><button type="button" class="primary" data-action="edit-client" data-id="' + person.id + '">Modificar</button>' +
      '<button type="button" class="danger" data-action="ask-delete-client" data-id="' + person.id + '">Eliminar</button></div></main>'
    );
  }

  function field(label, name, value, extra) {
    return '<label class="field">' + label + '<input name="' + name + '" value="' + esc(value) + '" ' + (extra || "") + "></label>";
  }

  function options(list, current) {
    return list.map((item) => {
      const value = typeof item === "string" ? item : item.id;
      const label = typeof item === "string" ? item : item.label;
      return '<option value="' + esc(value) + '"' + (value === current ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
  }

  function renderClientForm() {
    const existing = ui.editingId ? Store.client(ui.editingId) : null;
    const account = existing ? Store.userById(existing.userId) : null;
    const source = ui.draft || (existing ? {
      name: existing.name,
      username: account ? account.username : "",
      password: "",
      email: existing.email,
      phone: existing.phone,
      plan: existing.plan,
      goal: existing.goal,
      status: existing.status,
      startWeight: existing.startWeight,
      currentWeight: existing.currentWeight,
      goalWeight: existing.goalWeight,
      height: existing.height,
      startFat: existing.startFat,
      fatPercent: existing.fatPercent,
      startMuscle: existing.startMuscle,
      musclePercent: existing.musclePercent,
      courseIds: existing.courseIds,
    } : {
      plan: "Plus",
      goal: "bajar",
      status: "Activo",
      height: 170,
      courseIds: [],
    });
    const selected = Array.isArray(source.courseIds) ? source.courseIds : source.courseIds ? [source.courseIds] : [];
    const checks = Store.courses().map((course) => {
      const checked = selected.includes(course.id) ? " checked" : "";
      return '<label class="check"><input type="checkbox" name="courseIds" value="' + course.id + '"' + checked + "><span><strong>" +
        esc(course.name) + "</strong><small>" + esc(daysLabel(course.days)) + " · " + esc(course.time) + " · " +
        esc(coachName(course.coachId)) + "</small></span></label>";
    }).join("");
    return (
      '<main class="screen" data-screen="client-form"><form data-action="save-client">' +
      (ui.formError ? '<p class="form-error">' + esc(ui.formError) + "</p>" : "") +
      "<fieldset><legend>Acceso</legend>" +
      field("Nombre", "name", source.name || "", "required") +
      '<div class="grid-2">' + field("Usuario", "username", source.username || "", "required") +
      field(existing ? "Contraseña nueva" : "Contraseña", "password", source.password || "", existing ? 'placeholder="Sin cambio"' : "required") +
      "</div>" + field("Correo", "email", source.email || "", 'inputmode="email"') +
      field("Teléfono", "phone", source.phone || "") +
      '<div class="grid-2"><label class="field">Plan<select name="plan">' + options(PLANS, source.plan) + "</select></label>" +
      '<label class="field">Objetivo<select name="goal">' + options(GOALS, source.goal) + "</select></label></div>" +
      '<label class="field">Estado<select name="status">' + options(STATUSES, source.status || "Activo") + "</select></label></fieldset>" +
      "<fieldset><legend>Cuerpo</legend><div class=\"grid-2\">" +
      field("Kilos al empezar", "startWeight", source.startWeight ?? "", 'inputmode="decimal" required') +
      field("Kilos actuales", "currentWeight", source.currentWeight ?? "", 'inputmode="decimal" required') +
      field("Meta en kilos", "goalWeight", source.goalWeight ?? "", 'inputmode="decimal"') +
      field("Estatura cm", "height", source.height ?? "", 'inputmode="decimal"') +
      field("Grasa inicial %", "startFat", source.startFat ?? "", 'inputmode="decimal"') +
      field("Grasa actual %", "fatPercent", source.fatPercent ?? "", 'inputmode="decimal" required') +
      field("Músculo inicial %", "startMuscle", source.startMuscle ?? "", 'inputmode="decimal"') +
      field("Músculo actual %", "musclePercent", source.musclePercent ?? "", 'inputmode="decimal" required') +
      "</div></fieldset><fieldset><legend>Cursos</legend>" + checks + "</fieldset>" +
      '<button class="primary" type="submit">Guardar cliente</button></form>' +
      (existing ? '<button type="button" class="danger mt" data-action="ask-delete-client" data-id="' + existing.id + '">Eliminar cliente</button>' : "") +
      "</main>"
    );
  }

  function renderStaffCourse(course) {
    const used = Store.enrolledCount(course.id);
    return (
      '<article class="person"><h3>' + esc(course.name) + "</h3><p class=\"muted\">" + esc(daysLabel(course.days)) +
      " · " + esc(course.time) + " · " + esc(coachName(course.coachId)) + "</p><p class=\"muted\">" +
      esc(course.room) + " · " + used + "/" + course.spots + " lugares · " + esc(course.level) + "</p>" +
      '<div class="person-actions"><button type="button" class="edit" data-action="edit-course" data-id="' + course.id + '">Modificar</button>' +
      '<button type="button" class="remove" data-action="ask-delete-course" data-id="' + course.id + '">Eliminar</button></div></article>'
    );
  }

  function renderCourseAdmin() {
    const list = Store.courses().map(renderStaffCourse).join("") || '<p class="empty">No hay cursos todavía.</p>';
    return '<main class="screen" data-screen="courses"><p class="muted">Capoeira, box y el resto del horario del gym.</p>' + list + "</main>";
  }

  function renderCourseForm() {
    const existing = ui.editingId ? Store.course(ui.editingId) : null;
    const source = ui.draft || existing || { days: [], duration: 60, spots: 20, level: "Todos", time: "18:00" };
    const selected = Array.isArray(source.days) ? source.days : source.days ? [source.days] : [];
    const days = DAYS.map((day) => {
      const checked = selected.includes(day.id) ? " checked" : "";
      return '<label class="check"><input type="checkbox" name="days" value="' + day.id + '"' + checked + "><span>" + day.label + "</span></label>";
    }).join("");
    const coachOptions = Store.coaches().map((person) => ({ id: person.id, label: person.name }));
    return (
      '<main class="screen" data-screen="course-form"><form data-action="save-course">' +
      (ui.formError ? '<p class="form-error">' + esc(ui.formError) + "</p>" : "") +
      field("Nombre", "name", source.name || "", "required") +
      '<div class="grid-2">' + field("Hora", "time", source.time || "", 'type="time" required') +
      field("Minutos", "duration", source.duration ?? 60, 'inputmode="numeric"') + "</div>" +
      '<label class="field">Coach<select name="coachId">' + options(coachOptions, source.coachId) + "</select></label>" +
      field("Sala", "room", source.room || "", 'placeholder="Ring"') +
      '<div class="grid-2"><label class="field">Nivel<select name="level">' + options(LEVELS, source.level || "Todos") + "</select></label>" +
      field("Cupo (máx. 20)", "spots", source.spots ?? 20, 'inputmode="numeric" max="20"') + "</div>" +
      "<fieldset><legend>Días</legend>" + days + "</fieldset>" +
      '<button class="primary" type="submit">Guardar curso</button></form></main>'
    );
  }

  function renderCoachAdmin() {
    const list = Store.coaches().map((person) => {
      const classes = Store.courses().filter((course) => course.coachId === person.id).length;
      const classLabel = classes === 1 ? "1 clase" : classes + " clases";
      return '<article class="person"><h3>' + esc(person.name) + "</h3><p class=\"muted\">" + esc(person.specialty) +
        " · " + person.years + " años · " + classLabel + "</p><p>" + esc(person.bio) + "</p>" +
        '<div class="person-actions"><button type="button" class="edit" data-action="edit-coach" data-id="' + person.id + '">Modificar</button>' +
        '<button type="button" class="remove" data-action="ask-delete-coach" data-id="' + person.id + '">Eliminar</button></div></article>';
    }).join("");
    return '<main class="screen" data-screen="coaches">' + (list || '<p class="empty">Aún no hay coaches.</p>') + "</main>";
  }

  function renderCoachForm() {
    const existing = ui.editingId ? Store.coach(ui.editingId) : null;
    const source = ui.draft || existing || { years: 1 };
    return (
      '<main class="screen" data-screen="coach-form"><form data-action="save-coach">' +
      (ui.formError ? '<p class="form-error">' + esc(ui.formError) + "</p>" : "") +
      field("Nombre", "name", source.name || "", "required") +
      field("Especialidad", "specialty", source.specialty || "", "required") +
      field("Años de experiencia", "years", source.years ?? "", 'inputmode="numeric"') +
      '<label class="field">Bio<textarea name="bio">' + esc(source.bio || "") + "</textarea></label>" +
      '<button class="primary" type="submit">Guardar coach</button></form></main>'
    );
  }

  function renderTeam() {
    const people = Store.users().filter((user) => user.role === "admin" || user.role === "empleado");
    const cards = people.map((person) => {
      return '<article class="person"><h3>' + esc(person.name) + "</h3><p class=\"muted\">" + roleLabel(person.role) +
        " · " + esc(person.title || "Staff") + "</p><p class=\"muted\">Usuario " + esc(person.username) + "</p>" +
        '<div class="person-actions"><button type="button" class="edit" data-action="edit-employee" data-id="' + person.id + '">Modificar</button>' +
        '<button type="button" class="remove" data-action="ask-delete-employee" data-id="' + person.id + '">Eliminar</button></div></article>';
    }).join("");
    return '<main class="screen" data-screen="team"><p class="muted">Admin y empleados que pueden entrar al panel.</p>' + cards + "</main>";
  }

  function renderEmployeeForm() {
    const existing = ui.editingId ? Store.userById(ui.editingId) : null;
    const source = ui.draft || existing || {};
    return (
      '<main class="screen" data-screen="employee-form"><form data-action="save-employee">' +
      (ui.formError ? '<p class="form-error">' + esc(ui.formError) + "</p>" : "") +
      field("Nombre", "name", source.name || "", "required") +
      field("Usuario", "username", source.username || "", "required") +
      field(existing ? "Contraseña nueva" : "Contraseña", "password", source.password && ui.draft ? source.password : "", existing ? 'placeholder="Sin cambio"' : "required") +
      field("Puesto", "title", source.title || "", 'placeholder="Recepción"') +
      '<button class="primary" type="submit">Guardar</button></form></main>'
    );
  }

  function renderSheet() {
    const sheet = ui.sheet;
    let title = "¿Eliminar?";
    let text = "Esta acción solo afecta los datos de este navegador.";
    if (sheet.kind === "delete-client") {
      const person = Store.client(sheet.id);
      title = person ? "¿Eliminar a " + person.name + "?" : "¿Eliminar cliente?";
      text = "Se borra su ficha y ya no podrá iniciar sesión.";
    } else if (sheet.kind === "delete-course") {
      title = "¿Eliminar este curso?";
      text = "Los clientes dejan de verlo en Mis cursos.";
    } else if (sheet.kind === "delete-coach") {
      title = "¿Eliminar este coach?";
      text = "Solo si no tiene clases asignadas.";
    } else if (sheet.kind === "delete-employee") {
      title = "¿Eliminar este acceso?";
      text = "Esa persona ya no podrá entrar al panel.";
    }
    return (
      '<div class="sheet-back" data-action="close-sheet"><div class="sheet" data-action="noop"><h3>' + esc(title) + "</h3><p>" +
      esc(text) + '</p><button type="button" class="danger" data-action="confirm-sheet">Eliminar</button>' +
      '<button type="button" class="ghost" data-action="close-sheet">Cancelar</button></div></div>'
    );
  }

  function formToObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key === "courseIds" || key === "days") return;
      data[key] = value;
    });
    if (form.querySelector('input[name="courseIds"]')) {
      data.courseIds = Array.from(form.querySelectorAll('input[name="courseIds"]:checked')).map((input) => input.value);
    }
    if (form.querySelector('input[name="days"]')) {
      data.days = Array.from(form.querySelectorAll('input[name="days"]:checked')).map((input) => input.value);
    }
    return data;
  }

  function failForm(form, message) {
    ui.draft = formToObject(form);
    ui.formError = message;
    render();
  }

  function onClick(event) {
    const el = event.target.closest("[data-action]");
    if (!el || !document.getElementById("app").contains(el)) return;
    const action = el.dataset.action;
    if (action === "noop") {
      event.stopPropagation();
      return;
    }
    if (action === "toggle-pass") {
      const input = document.getElementById("login-pass");
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      el.innerHTML = show ? icons.eyeOff : icons.eye;
      el.classList.toggle("on", show);
      el.setAttribute("aria-label", show ? "Ocultar contraseña" : "Mostrar contraseña");
      return;
    }
    if (action === "go") {
      go(el.dataset.view);
      return;
    }
    if (action === "back") {
      pop();
      return;
    }
    if (action === "logout") {
      Store.logout();
      ui.loginError = "";
      ui.stack = [];
      ui.view = "home";
      render();
      return;
    }
    if (action === "reset-demo") {
      Store.reset();
      ui.search = "";
      showToast("Datos de demostración restaurados");
      return;
    }
    if (action === "open-profile") {
      push("profile");
      return;
    }
    if (action === "open-weight") {
      ui.weightOpen = true;
      ui.weightError = "";
      render();
      return;
    }
    if (action === "close-weight") {
      ui.weightOpen = false;
      ui.weightError = "";
      render();
      return;
    }
    if (action === "course-tab") {
      ui.courseTab = el.dataset.tab === "all" ? "all" : "mine";
      render();
      return;
    }
    if (action === "enroll") {
      const person = Store.clientOf(Store.session());
      if (!person) return;
      const result = Store.enrollCourse(person.id, el.dataset.id);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      ui.courseTab = "mine";
      showToast("Listo, ya está en Mis cursos");
      return;
    }
    if (action === "set-day") {
      if (el.dataset.which === "routine") ui.routineDay = el.dataset.day;
      else ui.courseDay = el.dataset.day;
      render();
      return;
    }
    if (action === "toggle-exercise") {
      const client = Store.clientOf(Store.session());
      if (client) Store.toggleExercise(client.id, el.dataset.day, Number(el.dataset.index));
      render();
      return;
    }
    if (action === "water") {
      const client = Store.clientOf(Store.session());
      if (client) Store.setWater(client.id, Number(el.dataset.n));
      render();
      return;
    }
    if (action === "check-in") {
      const client = Store.clientOf(Store.session());
      if (client) {
        Store.checkIn(client.id);
        showToast("Visita registrada");
      }
      return;
    }
    if (action === "ask") {
      sendChat(el.dataset.text || "");
      return;
    }
    if (action === "open-client") {
      push("client-detail", el.dataset.id);
      return;
    }
    if (action === "new-client") return push("client-form", null);
    if (action === "edit-client") return push("client-form", el.dataset.id);
    if (action === "new-course") return push("course-form", null);
    if (action === "edit-course") return push("course-form", el.dataset.id);
    if (action === "new-coach") return push("coach-form", null);
    if (action === "edit-coach") return push("coach-form", el.dataset.id);
    if (action === "new-employee") return push("employee-form", null);
    if (action === "edit-employee") return push("employee-form", el.dataset.id);
    if (action === "ask-delete-client") {
      ui.sheet = { kind: "delete-client", id: el.dataset.id };
      render();
      return;
    }
    if (action === "ask-delete-course") {
      ui.sheet = { kind: "delete-course", id: el.dataset.id };
      render();
      return;
    }
    if (action === "ask-delete-coach") {
      ui.sheet = { kind: "delete-coach", id: el.dataset.id };
      render();
      return;
    }
    if (action === "ask-delete-employee") {
      ui.sheet = { kind: "delete-employee", id: el.dataset.id };
      render();
      return;
    }
    if (action === "close-sheet") {
      ui.sheet = null;
      render();
      return;
    }
    if (action === "confirm-sheet") {
      confirmDelete();
    }
  }

  function confirmDelete() {
    const sheet = ui.sheet;
    if (!sheet) return;
    let result = { ok: false, error: "No se pudo eliminar." };
    if (sheet.kind === "delete-client") result = Store.deleteClient(sheet.id);
    if (sheet.kind === "delete-course") result = Store.deleteCourse(sheet.id);
    if (sheet.kind === "delete-coach") result = Store.deleteCoach(sheet.id);
    if (sheet.kind === "delete-employee") result = Store.deleteEmployee(sheet.id);
    ui.sheet = null;
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    ui.stack = [];
    ui.editingId = null;
    if (sheet.kind === "delete-client") ui.view = "clients";
    if (sheet.kind === "delete-course") ui.view = "courses";
    if (sheet.kind === "delete-coach") ui.view = "coaches";
    if (sheet.kind === "delete-employee") ui.view = "team";
    showToast("Eliminado");
  }

  function onInput(event) {
    if (event.target.id === "search") {
      ui.search = event.target.value;
      render();
    }
  }

  function onSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const action = form.dataset.action;
    if (action === "login") {
      const data = formToObject(form);
      enter(data.username, data.password);
      return;
    }
    if (action === "send-chat") {
      sendChat(formToObject(form).text || "");
      return;
    }
    if (action === "save-weight") {
      const person = Store.clientOf(Store.session());
      const result = person ? Store.registerWeight(person.id, formToObject(form).weight) : { ok: false, error: "Inicia sesión de nuevo." };
      if (!result.ok) {
        ui.weightOpen = true;
        ui.weightError = result.error;
        render();
        return;
      }
      ui.weightOpen = false;
      ui.weightError = "";
      showToast("Progreso registrado");
      return;
    }
    if (action === "save-client") {
      const data = formToObject(form);
      data.id = ui.editingId || "";
      const result = Store.saveClient(data);
      if (!result.ok) return failForm(form, result.error);
      ui.draft = null;
      ui.formError = "";
      ui.stack = [];
      ui.editingId = null;
      ui.view = "clients";
      showToast("Cliente guardado");
      return;
    }
    if (action === "save-course") {
      const data = formToObject(form);
      data.id = ui.editingId || "";
      const result = Store.saveCourse(data);
      if (!result.ok) return failForm(form, result.error);
      ui.draft = null;
      ui.stack = [];
      ui.editingId = null;
      ui.view = "courses";
      showToast("Curso guardado");
      return;
    }
    if (action === "save-coach") {
      const data = formToObject(form);
      data.id = ui.editingId || "";
      const result = Store.saveCoach(data);
      if (!result.ok) return failForm(form, result.error);
      ui.draft = null;
      ui.stack = [];
      ui.editingId = null;
      ui.view = "coaches";
      showToast("Coach guardado");
      return;
    }
    if (action === "save-employee") {
      const data = formToObject(form);
      data.id = ui.editingId || "";
      const result = Store.saveEmployee(data);
      if (!result.ok) return failForm(form, result.error);
      ui.draft = null;
      ui.stack = [];
      ui.editingId = null;
      ui.view = "team";
      showToast("Empleado guardado");
    }
  }

  function enter(username, password) {
    const result = Store.login(username, password);
    if (!result.ok) {
      ui.loginError = result.error;
      render();
      return;
    }
    ui.loginError = "";
    homeFor(result.user.role);
    render();
  }

  function sendChat(text) {
    const client = Store.clientOf(Store.session());
    const clean = String(text || "").trim();
    if (!client || !clean) return;
    Store.pushMessage(client.id, "me", clean);
    const fresh = Store.client(client.id);
    Store.pushMessage(client.id, "coach", FitCoach.reply(fresh, clean));
    ui.view = "coach";
    ui.pinChat = true;
    ui.focusChat = true;
    render();
  }

  return { boot };
})();

App.boot();
