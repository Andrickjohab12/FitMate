function foldText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isoDate(date) {
  const d = date ? new Date(date) : new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function yesterdayIso() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
}

function routineFor(goal) {
  const gain = goal === "ganar";
  const rest = gain ? "90 s" : "45 s";
  const step = (name, sets, reps) => ({ name, sets, reps, rest });
  return {
    lunes: {
      title: "Día de pierna",
      note: gain
        ? "Baja en tres segundos y sube con decisión."
        : "Descansos cortos. No sueltes la postura.",
      exercises: [
        step(gain ? "Sentadilla trasera" : "Sentadilla goblet", 4, gain ? "6-8" : "12"),
        step("Peso muerto rumano", 3, gain ? "8" : "12"),
        step("Zancadas caminando", 3, "10 por lado"),
        step("Elevación de talones", 3, "15"),
      ],
    },
    martes: {
      title: "Día de tren superior",
      note: "Pecho, hombro y brazos. Controla la bajada.",
      exercises: [
        step(gain ? "Press banca" : "Flexiones", 4, gain ? "6-8" : "12"),
        step("Press militar", 3, "10"),
        step("Remo con mancuerna", 3, "12"),
        step(gain ? "Fondos en banco" : "Curl de bíceps", 3, gain ? "8" : "15"),
      ],
    },
    miercoles: {
      title: "Día de espalda",
      note: "Aprieta los omóplatos al final de cada repetición.",
      exercises: [
        step("Jalón al pecho", 4, "10"),
        step("Remo sentado", 3, "12"),
        step("Face pull", 3, "15"),
        step(gain ? "Peso muerto convencional" : "Superman", 3, gain ? "5" : "12"),
      ],
    },
    jueves: {
      title: "Día de core",
      note: "Respira. La zona media no se apaga entre ejercicios.",
      exercises: [
        step("Plancha", 3, gain ? "30 s" : "40 s"),
        step("Dead bug", 3, "10 por lado"),
        step("Pallof press", 3, "12"),
        step("Hiperextensión", 3, "12"),
      ],
    },
    viernes: {
      title: "Día de pierna y glúteo",
      note: "Empuja el piso con el talón, no con la punta.",
      exercises: [
        step("Hip thrust", 4, gain ? "8" : "12"),
        step("Sentadilla búlgara", 3, "8 por lado"),
        step("Puente de glúteo", 3, "15"),
        step("Caminata del granjero", 3, "30 m"),
      ],
    },
  };
}

function member(partial) {
  return Object.assign(
    {
      status: "Activo",
      streak: 4,
      lastCheckIn: yesterdayIso(),
      water: { date: "", count: 0 },
      checks: {},
    },
    partial
  );
}

const FitSeed = {
  snapshot() {
    return {
      sessionUserId: null,
      messages: {},
      coaches: [
        {
          id: "co-bruno",
          name: "Bruno Salas",
          specialty: "Capoeira y funcional",
          years: 8,
          bio: "Trabaja ritmo, coordinación y fuerza útil para el día a día.",
        },
        {
          id: "co-luna",
          name: "Luna Paredes",
          specialty: "Box y spinning",
          years: 6,
          bio: "Clases intensas, técnica primero y energía hasta el último round.",
        },
        {
          id: "co-irene",
          name: "Irene Campos",
          specialty: "Yoga y movilidad",
          years: 10,
          bio: "Movilidad de cadera y espalda para que la fuerza no se estanque.",
        },
        {
          id: "co-mateo",
          name: "Mateo Ríos",
          specialty: "Fuerza",
          years: 5,
          bio: "Progresión de cargas, técnica de sentadilla y peso muerto.",
        },
      ],
      courses: [
        {
          id: "cu-capoeira",
          name: "Capoeira",
          days: ["lunes", "miercoles"],
          time: "18:00",
          duration: 60,
          coachId: "co-bruno",
          room: "Sala Bambú",
          level: "Todos",
          spots: 18,
        },
        {
          id: "cu-box",
          name: "Box",
          days: ["martes", "jueves"],
          time: "19:30",
          duration: 60,
          coachId: "co-luna",
          room: "Ring",
          level: "Medio",
          spots: 14,
        },
        {
          id: "cu-yoga",
          name: "Yoga",
          days: ["lunes", "viernes"],
          time: "07:00",
          duration: 60,
          coachId: "co-irene",
          room: "Sala Calma",
          level: "Todos",
          spots: 16,
        },
        {
          id: "cu-funcional",
          name: "Funcional",
          days: ["martes", "jueves"],
          time: "06:30",
          duration: 50,
          coachId: "co-bruno",
          room: "Zona Box",
          level: "Todos",
          spots: 20,
        },
        {
          id: "cu-spinning",
          name: "Spinning",
          days: ["miercoles", "viernes"],
          time: "18:30",
          duration: 45,
          coachId: "co-luna",
          room: "Sala Bikes",
          level: "Medio",
          spots: 15,
        },
        {
          id: "cu-fuerza",
          name: "Fuerza",
          days: ["lunes", "miercoles", "viernes"],
          time: "12:15",
          duration: 60,
          coachId: "co-mateo",
          room: "Sala de pesas",
          level: "Medio",
          spots: 12,
        },
        {
          id: "cu-movilidad",
          name: "Movilidad",
          days: ["jueves"],
          time: "20:15",
          duration: 45,
          coachId: "co-irene",
          room: "Sala Calma",
          level: "Inicial",
          spots: 16,
        },
      ],
      users: [
        {
          id: "u-admin",
          username: "Admin",
          password: "admin123",
          role: "admin",
          name: "Camila Ortiz",
          title: "Dirección",
        },
        {
          id: "u-andrick",
          username: "Andrick",
          password: "130306",
          role: "empleado",
          name: "Andrick",
          title: "Recepción y seguimiento",
        },
        {
          id: "u-lucia",
          username: "Lucia",
          password: "lucia123",
          role: "empleado",
          name: "Lucía Vega",
          title: "Coordinación de clases",
        },
        {
          id: "u-maria",
          username: "Maria",
          password: "maria123",
          role: "cliente",
          name: "María López",
          clientId: "c-maria",
        },
        {
          id: "u-carlos",
          username: "Carlos",
          password: "carlos123",
          role: "cliente",
          name: "Carlos Méndez",
          clientId: "c-carlos",
        },
        {
          id: "u-ana",
          username: "Ana",
          password: "ana123",
          role: "cliente",
          name: "Ana Ruiz",
          clientId: "c-ana",
        },
        {
          id: "u-diego",
          username: "Diego",
          password: "diego123",
          role: "cliente",
          name: "Diego Herrera",
          clientId: "c-diego",
        },
        {
          id: "u-valeria",
          username: "Valeria",
          password: "valeria123",
          role: "cliente",
          name: "Valeria Soto",
          clientId: "c-valeria",
        },
      ],
      clients: [
        member({
          id: "c-maria",
          userId: "u-maria",
          name: "María López",
          email: "maria@correo.com",
          phone: "55 1402 8831",
          plan: "Plus",
          goal: "bajar",
          height: 165,
          startWeight: 78,
          currentWeight: 71.4,
          goalWeight: 65,
          startFat: 34.2,
          fatPercent: 28.6,
          startMuscle: 26.4,
          musclePercent: 30.8,
          startDate: "2026-04-14",
          weekly: [78, 77.1, 76.4, 75.2, 74, 73.1, 72.2, 71.4],
          courseIds: ["cu-capoeira", "cu-yoga"],
          streak: 6,
          routine: routineFor("bajar"),
        }),
        member({
          id: "c-carlos",
          userId: "u-carlos",
          name: "Carlos Méndez",
          email: "carlos@correo.com",
          phone: "55 8821 4409",
          plan: "Elite",
          goal: "ganar",
          height: 178,
          startWeight: 70,
          currentWeight: 74.2,
          goalWeight: 78,
          startFat: 18.5,
          fatPercent: 15.2,
          startMuscle: 36,
          musclePercent: 41.5,
          startDate: "2026-05-02",
          weekly: [70, 70.4, 71, 71.8, 72.5, 73.1, 73.8, 74.2],
          courseIds: ["cu-box", "cu-fuerza"],
          streak: 11,
          routine: routineFor("ganar"),
        }),
        member({
          id: "c-ana",
          userId: "u-ana",
          name: "Ana Ruiz",
          email: "ana@correo.com",
          phone: "55 2208 1194",
          plan: "Básico",
          goal: "bajar",
          height: 160,
          startWeight: 64,
          currentWeight: 61.8,
          goalWeight: 58,
          startFat: 29,
          fatPercent: 25.4,
          startMuscle: 28.1,
          musclePercent: 31,
          startDate: "2026-06-09",
          weekly: [64, 63.6, 63.2, 62.8, 62.4, 62.1, 61.9, 61.8],
          courseIds: ["cu-yoga", "cu-movilidad", "cu-funcional"],
          streak: 4,
          routine: routineFor("bajar"),
        }),
        member({
          id: "c-diego",
          userId: "u-diego",
          name: "Diego Herrera",
          email: "diego@correo.com",
          phone: "55 6730 2281",
          plan: "Plus",
          goal: "bajar",
          height: 175,
          startWeight: 92,
          currentWeight: 85.5,
          goalWeight: 80,
          startFat: 31.5,
          fatPercent: 26.1,
          startMuscle: 29,
          musclePercent: 33.4,
          startDate: "2026-03-20",
          weekly: [92, 90.8, 89.6, 88.4, 87.5, 86.8, 86, 85.5],
          courseIds: ["cu-box", "cu-funcional", "cu-fuerza"],
          streak: 8,
          routine: routineFor("bajar"),
        }),
        member({
          id: "c-valeria",
          userId: "u-valeria",
          name: "Valeria Soto",
          email: "valeria@correo.com",
          phone: "55 9012 3348",
          plan: "Plus",
          goal: "mantener",
          height: 162,
          startWeight: 58,
          currentWeight: 56.2,
          goalWeight: 56,
          startFat: 27.8,
          fatPercent: 24.2,
          startMuscle: 30.2,
          musclePercent: 33.1,
          startDate: "2026-07-01",
          weekly: [58, 57.8, 57.5, 57.2, 56.9, 56.6, 56.4, 56.2],
          courseIds: ["cu-capoeira", "cu-spinning"],
          streak: 3,
          routine: routineFor("mantener"),
        }),
      ],
    };
  },
};
