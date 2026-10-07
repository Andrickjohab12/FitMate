const Store = (() => {
  const KEY = "fitmate-demo-v1";
  let db = null;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : FitSeed.snapshot();
      if (!db || !Array.isArray(db.users) || !Array.isArray(db.clients)) {
        db = FitSeed.snapshot();
      }
    } catch (err) {
      db = FitSeed.snapshot();
    }
    if (!db.messages) db.messages = {};
    if (db.sessionUserId && !db.users.some((user) => user.id === db.sessionUserId)) {
      db.sessionUserId = null;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      /* La sesión sigue en memoria si el navegador no puede guardar. */
    }
  }

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 8);
  }

  function num(value) {
    const n = parseFloat(String(value ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }

  function session() {
    return db.users.find((user) => user.id === db.sessionUserId) || null;
  }

  function login(username, password) {
    const name = foldText(username);
    const pass = String(password ?? "").trim();
    if (!name || !pass) {
      return { ok: false, error: "Escribe usuario y contraseña." };
    }
    const user = db.users.find((item) => foldText(item.username) === name);
    if (!user || user.password !== pass) {
      return { ok: false, error: "Usuario o contraseña incorrectos." };
    }
    db.sessionUserId = user.id;
    save();
    return { ok: true, user };
  }

  function logout() {
    db.sessionUserId = null;
    save();
  }

  function reset() {
    const current = db.sessionUserId;
    db = FitSeed.snapshot();
    if (db.users.some((user) => user.id === current)) db.sessionUserId = current;
    save();
  }

  function users() {
    return db.users;
  }

  function clients() {
    return db.clients;
  }

  function courses() {
    return db.courses;
  }

  function coaches() {
    return db.coaches;
  }

  function client(id) {
    return db.clients.find((item) => item.id === id) || null;
  }

  function clientOf(user) {
    if (!user) return null;
    return db.clients.find((item) => item.id === user.clientId) || null;
  }

  function coach(id) {
    return db.coaches.find((item) => item.id === id) || null;
  }

  function course(id) {
    return db.courses.find((item) => item.id === id) || null;
  }

  function userById(id) {
    return db.users.find((item) => item.id === id) || null;
  }

  function usernameTaken(username, exceptUserId) {
    const folded = foldText(username);
    return db.users.some((user) => foldText(user.username) === folded && user.id !== exceptUserId);
  }

  function enrolledCount(courseId) {
    return db.clients.filter((item) => item.courseIds.includes(courseId)).length;
  }

  function saveClient(input) {
    const name = String(input.name || "").trim();
    const username = String(input.username || "").trim();
    const password = String(input.password || "").trim();
    const email = String(input.email || "").trim();
    if (!name) return { ok: false, error: "Escribe el nombre." };
    if (!username) return { ok: false, error: "Escribe un usuario para iniciar sesión." };
    if (email && !email.includes("@")) return { ok: false, error: "Revisa el correo." };

    const existing = input.id ? client(input.id) : null;
    if (input.id && !existing) return { ok: false, error: "Ese cliente ya no está." };
    if (usernameTaken(username, existing ? existing.userId : null)) {
      return { ok: false, error: "Ese usuario ya existe." };
    }
    if (!existing && password.length < 4) {
      return { ok: false, error: "La contraseña necesita al menos 4 caracteres." };
    }
    if (existing && password && password.length < 4) {
      return { ok: false, error: "La contraseña necesita al menos 4 caracteres." };
    }

    const currentWeight = num(input.currentWeight);
    const startWeight = num(input.startWeight) || currentWeight;
    const fatPercent = num(input.fatPercent);
    const musclePercent = num(input.musclePercent);
    const startFat = num(input.startFat) || fatPercent;
    const startMuscle = num(input.startMuscle) || musclePercent;
    const height = num(input.height) || 170;
    if (currentWeight <= 0 || startWeight <= 0) return { ok: false, error: "Revisa los pesos en kilos." };
    if (fatPercent <= 0 || musclePercent <= 0) return { ok: false, error: "Indica el porcentaje de grasa y de músculo." };
    if (height < 120 || height > 230) return { ok: false, error: "Revisa la estatura en centímetros." };

    const goal = input.goal || "bajar";
    let goalWeight = num(input.goalWeight);
    if (!goalWeight) {
      if (goal === "ganar") goalWeight = Math.round((currentWeight + 4) * 10) / 10;
      else if (goal === "bajar") goalWeight = Math.round((currentWeight - 5) * 10) / 10;
      else goalWeight = currentWeight;
    }

    const courseIds = Array.isArray(input.courseIds) ? input.courseIds : [];
    const fields = {
      name,
      email,
      phone: String(input.phone || "").trim(),
      plan: input.plan || "Plus",
      goal,
      status: input.status || "Activo",
      height,
      startWeight,
      currentWeight,
      goalWeight,
      startFat,
      fatPercent,
      startMuscle,
      musclePercent,
      courseIds,
    };

    if (!existing) {
      const id = uid("c");
      const userId = uid("u");
      const weekly = startWeight === currentWeight ? [currentWeight] : [startWeight, currentWeight];
      db.clients.unshift({
        id,
        userId,
        ...fields,
        startDate: isoDate(),
        weekly,
        streak: 0,
        lastCheckIn: "",
        water: { date: "", count: 0 },
        checks: {},
        routine: routineFor(goal),
      });
      db.users.push({
        id: userId,
        username,
        password,
        role: "cliente",
        name,
        clientId: id,
      });
    } else {
      const previous = existing.currentWeight;
      const goalChanged = existing.goal !== goal;
      Object.assign(existing, fields);
      if (goalChanged) existing.routine = routineFor(goal);
      if (previous !== currentWeight) {
        existing.weekly = existing.weekly.concat(currentWeight).slice(-8);
      }
      const account = userById(existing.userId);
      if (account) {
        account.username = username;
        account.name = name;
        if (password) account.password = password;
      }
    }

    save();
    return { ok: true };
  }

  function deleteClient(id) {
    const person = client(id);
    if (!person) return { ok: false, error: "Ese cliente ya no está." };
    db.clients = db.clients.filter((item) => item.id !== id);
    db.users = db.users.filter((item) => item.id !== person.userId);
    delete db.messages[id];
    save();
    return { ok: true };
  }

  function saveCourse(input) {
    const name = String(input.name || "").trim();
    const days = Array.isArray(input.days) ? input.days : [];
    const time = String(input.time || "").trim();
    const coachId = input.coachId;
    if (!name) return { ok: false, error: "Escribe el nombre de la clase." };
    if (!days.length) return { ok: false, error: "Elige al menos un día." };
    if (!time) return { ok: false, error: "Indica la hora." };
    if (!coach(coachId)) return { ok: false, error: "Elige un coach." };
    const duration = num(input.duration) || 60;
    const spots = num(input.spots) || 12;
    const fields = {
      name,
      days,
      time,
      duration,
      coachId,
      room: String(input.room || "Sala principal").trim(),
      level: input.level || "Todos",
      spots,
    };
    if (input.id && course(input.id)) Object.assign(course(input.id), fields);
    else db.courses.unshift({ id: uid("cu"), ...fields });
    save();
    return { ok: true };
  }

  function deleteCourse(id) {
    if (!course(id)) return { ok: false, error: "Esa clase ya no está." };
    db.courses = db.courses.filter((item) => item.id !== id);
    db.clients.forEach((item) => {
      item.courseIds = item.courseIds.filter((courseId) => courseId !== id);
    });
    save();
    return { ok: true };
  }

  function saveCoach(input) {
    const name = String(input.name || "").trim();
    const specialty = String(input.specialty || "").trim();
    if (!name) return { ok: false, error: "Escribe el nombre del coach." };
    if (!specialty) return { ok: false, error: "Escribe su especialidad." };
    const fields = {
      name,
      specialty,
      years: Math.max(0, num(input.years)),
      bio: String(input.bio || "").trim(),
    };
    if (input.id && coach(input.id)) Object.assign(coach(input.id), fields);
    else db.coaches.unshift({ id: uid("co"), ...fields });
    save();
    return { ok: true };
  }

  function deleteCoach(id) {
    if (!coach(id)) return { ok: false, error: "Ese coach ya no está." };
    if (db.courses.some((item) => item.coachId === id)) {
      return { ok: false, error: "Tiene clases asignadas. Cámbialas antes de eliminarlo." };
    }
    db.coaches = db.coaches.filter((item) => item.id !== id);
    save();
    return { ok: true };
  }

  function saveEmployee(input) {
    const name = String(input.name || "").trim();
    const username = String(input.username || "").trim();
    const password = String(input.password || "").trim();
    const title = String(input.title || "").trim();
    if (!name) return { ok: false, error: "Escribe el nombre." };
    if (!username) return { ok: false, error: "Escribe un usuario." };
    if (!title) return { ok: false, error: "Escribe el puesto." };
    const existing = input.id ? userById(input.id) : null;
    if (input.id && !existing) return { ok: false, error: "Esa persona ya no está." };
    if (existing && existing.role === "cliente") return { ok: false, error: "Ese perfil es de un cliente." };
    if (usernameTaken(username, existing ? existing.id : null)) {
      return { ok: false, error: "Ese usuario ya existe." };
    }
    if (!existing && password.length < 4) {
      return { ok: false, error: "La contraseña necesita al menos 4 caracteres." };
    }
    if (existing && password && password.length < 4) {
      return { ok: false, error: "La contraseña necesita al menos 4 caracteres." };
    }
    if (!existing) {
      db.users.push({
        id: uid("u"),
        username,
        password,
        role: "empleado",
        name,
        title,
      });
    } else {
      existing.name = name;
      existing.username = username;
      existing.title = title;
      if (password) existing.password = password;
    }
    save();
    return { ok: true };
  }

  function deleteEmployee(id) {
    const person = userById(id);
    if (!person || person.role === "cliente") return { ok: false, error: "No se puede eliminar ese perfil." };
    if (person.id === db.sessionUserId) return { ok: false, error: "No puedes eliminar tu propia sesión." };
    const admins = db.users.filter((user) => user.role === "admin");
    if (person.role === "admin" && admins.length <= 1) {
      return { ok: false, error: "Tiene que quedar al menos un admin." };
    }
    db.users = db.users.filter((user) => user.id !== id);
    save();
    return { ok: true };
  }

  function messages(clientId) {
    return db.messages[clientId] || [];
  }

  function ensureWelcome(clientId, text) {
    if (!db.messages[clientId] || db.messages[clientId].length === 0) {
      pushMessage(clientId, "coach", text);
    }
  }

  function pushMessage(clientId, from, text) {
    if (!db.messages[clientId]) db.messages[clientId] = [];
    db.messages[clientId].push({ from, text, at: Date.now() });
    save();
  }

  function toggleExercise(clientId, day, index) {
    const person = client(clientId);
    if (!person) return;
    const key = isoDate() + ":" + day + ":" + index;
    if (!person.checks) person.checks = {};
    if (person.checks[key]) delete person.checks[key];
    else person.checks[key] = true;
    save();
  }

  function exerciseDone(client, day, index) {
    const key = isoDate() + ":" + day + ":" + index;
    return Boolean(client.checks && client.checks[key]);
  }

  function setWater(clientId, count) {
    const person = client(clientId);
    if (!person) return;
    const today = isoDate();
    const current = person.water && person.water.date === today ? person.water.count : 0;
    const next = current === count ? count - 1 : count;
    person.water = { date: today, count: Math.max(0, next) };
    save();
  }

  function waterCount(client) {
    if (!client.water || client.water.date !== isoDate()) return 0;
    return client.water.count;
  }

  function checkIn(clientId) {
    const person = client(clientId);
    if (!person) return;
    const today = isoDate();
    if (person.lastCheckIn === today) return;
    const previous = new Date();
    previous.setDate(previous.getDate() - 1);
    person.streak = person.lastCheckIn === isoDate(previous) ? (person.streak || 0) + 1 : 1;
    person.lastCheckIn = today;
    save();
  }

  function checkedInToday(client) {
    return client.lastCheckIn === isoDate();
  }

  return {
    load,
    save,
    reset,
    login,
    logout,
    session,
    users,
    clients,
    courses,
    coaches,
    client,
    clientOf,
    coach,
    course,
    userById,
    enrolledCount,
    saveClient,
    deleteClient,
    saveCourse,
    deleteCourse,
    saveCoach,
    deleteCoach,
    saveEmployee,
    deleteEmployee,
    messages,
    ensureWelcome,
    pushMessage,
    toggleExercise,
    exerciseDone,
    setWater,
    waterCount,
    checkIn,
    checkedInToday,
    num,
  };
})();
