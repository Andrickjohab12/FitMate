const FitCoach = (() => {
  const DAY_IDS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

  function firstName(name) {
    return String(name || "atleta").trim().split(/\s+/)[0];
  }

  function proteinRange(client) {
    const min = Math.round(client.currentWeight * 1.6);
    const max = Math.round(client.currentWeight * 2);
    return min + "–" + max + " g";
  }

  function liters(client) {
    return (Math.round(client.currentWeight * 0.35) / 10).toFixed(1);
  }

  function todayPlan(client) {
    const day = DAY_IDS[new Date().getDay()];
    return client.routine ? client.routine[day] : null;
  }

  function meal(client) {
    const training = todayPlan(client);
    const session = training ? training.title.toLowerCase() : "descanso";
    if (client.goal === "ganar") {
      return (
        "Hoy toca " + session + ". Para subir con calidad: desayuna avena, plátano y yogur; come arroz, pollo y verdura; cena pasta o papa con atún. " +
        "Apunta a " + proteinRange(client) + " de proteína y no llegues vacío al entrenamiento."
      );
    }
    if (client.goal === "mantener") {
      return (
        "Hoy es " + session + ". Arma el plato así: mitad verdura, un cuarto de proteína y un cuarto de carbohidrato. " +
        "Con " + client.currentWeight + " kg te vienen bien " + proteinRange(client) + " de proteína, sin recortar de más."
      );
    }
    return (
      "Hoy es " + session + ". Desayuna huevo, fruta y una porción pequeña de avena. Come pollo o pescado, ensalada y arroz medido. " +
      "Cena requesón o pescado con verdura. Tu rango de proteína es " + proteinRange(client) + "."
    );
  }

  function welcome(client) {
    const delta = Math.round((client.startWeight - client.currentWeight) * 10) / 10;
    let change = "mantienes el peso de salida";
    if (delta > 0) change = "bajaste " + delta + " kg desde los " + client.startWeight + " kg";
    if (delta < 0) change = "subiste " + Math.abs(delta) + " kg desde los " + client.startWeight + " kg";
    return (
      "Hola " + firstName(client.name) + ", soy FitMate Coach. Empezaste en " + client.startWeight +
      " kg y hoy estás en " + client.currentWeight + " kg: " + change + ". Tu grasa va en " +
      client.fatPercent + "% y tu músculo en " + client.musclePercent +
      "%. Pregúntame qué comer hoy, cuánta proteína necesitas, ideas de cena o cuánta agua tomar."
    );
  }

  function tip(client) {
    const ideas = [
      () => "Hoy prioriza proteína: cerca de " + proteinRange(client) + " te ayudan a cuidar el músculo mientras cambia el peso.",
      () => "Camina 8–10 minutos después de comer. Baja el antojo de la tarde sin saltarte la cena.",
      () => "Mitad del plato en verdura, un cuarto en proteína y un cuarto en arroz, papa o tortilla.",
      () => "Si entrenas tarde, cena igual. Un huevo, yogur o atún evitan que el músculo se quede sin material.",
      () => "El fin de semana repite el desayuno de entre semana. Ahí se suele ir el progreso.",
      () => "Busca 7 horas de sueño. Con " + client.fatPercent + "% de grasa, el descanso mueve la báscula tanto como la clase.",
      () => "Agua antes del café. Hoy te corresponden unos " + liters(client) + " L.",
    ];
    return ideas[new Date().getDate() % ideas.length]();
  }

  function reply(client, message) {
    const text = foldText(message);
    const name = firstName(client.name);
    const fatDelta = Math.round((client.startFat - client.fatPercent) * 10) / 10;
    const muscleDelta = Math.round((client.musclePercent - client.startMuscle) * 10) / 10;

    if (/hola|buenas|hey|que tal/.test(text)) {
      return "Hola " + name + ". " + tip(client);
    }
    if (/prote/.test(text)) {
      return (
        "Con " + client.currentWeight + " kg y " + client.musclePercent + "% de músculo, reparte " +
        proteinRange(client) + " de proteína en 3 o 4 comidas. Sirve huevo, yogur griego, pollo, atún, requesón o lentejas. " +
        "Si una comida se queda solo en pan o fruta, el día se te queda corto."
      );
    }
    if (/agua|hidrat/.test(text)) {
      return (
        "Bebe cerca de " + liters(client) + " L hoy. Un vaso al despertar, otro antes de entrenar y otro al terminar. " +
        "Si la clase es Capoeira o Box, lleva la botella a la sala: la sed llega tarde."
      );
    }
    if (/cena|noche/.test(text)) {
      if (client.goal === "ganar") {
        return "Cena con carbohidrato y proteína: tortilla o papa, huevo o pavo, y fruta. No hace falta un tazón enorme, sí hace falta cerrar el día con comida de verdad.";
      }
      return "Cena ligera y completa: pescado, huevo o requesón, mucha verdura y una fruta si aún tienes hambre. Evita llegar solo con galletas después de la clase.";
    }
    if (/desayuno/.test(text)) {
      return "Desayuna en la primera hora: huevos o yogur, una fruta y avena o pan. Así la comida de media mañana no se convierte en lo primero que encuentres.";
    }
    if (/grasa/.test(text)) {
      const trend = fatDelta > 0 ? "bajó " + fatDelta + " puntos" : "aún no baja";
      return (
        "Empezaste en " + client.startFat + "% de grasa y hoy marcas " + client.fatPercent + "%: " + trend +
        ". Para seguir, sostén la proteína, camina a diario y deja el fin de semana parecido a un martes. La báscula sola no cuenta esa historia."
      );
    }
    if (/muscul/.test(text)) {
      return (
        "Tu músculo pasó de " + client.startMuscle + "% a " + client.musclePercent + "% (" +
        (muscleDelta >= 0 ? "+" : "") + muscleDelta + " pts). Entrena con el mismo peso o un poco más cuando cumplas todas las repeticiones, y no bajes la proteína de " +
        proteinRange(client) + "."
      );
    }
    if (/hoy|como|comer|comida|menu|dieta|nutri/.test(text)) {
      return meal(client);
    }
    if (/box|capoeira|clase|curso/.test(text)) {
      return "Si hoy tienes clase, come 60–90 minutos antes: yogur con fruta o un sándwich de pavo. Después, agua y una comida con proteína en la siguiente hora. No hace falta un batido si ya cenas bien.";
    }
    return (
      "Te sigo con lo que ya llevas, " + name + ": " + client.currentWeight + " kg, " +
      client.fatPercent + "% de grasa y " + client.musclePercent + "% de músculo. " +
      tip(client) + " Si quieres, pídeme la comida de hoy, la cena, la proteína o el agua."
    );
  }

  return { welcome, tip, reply, proteinRange, liters };
})();
