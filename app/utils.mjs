export function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function hashDevice(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
}

export function formatMoney(symbol, amount) {
  const digits = amount.toLocaleString("en-US");
  return `${symbol}${digits}`;
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (current.length || row.length) {
        row.push(current.trim());
        rows.push(row);
        row = [];
        current = "";
      }
      if (char === "\r" && next === "\n") {
        i += 1;
      }
    } else {
      current += char;
    }
  }
  if (current.length || row.length) {
    row.push(current.trim());
    rows.push(row);
  }
  return rows.filter((line) => line.some((cell) => cell.length));
}

export function validateCSV(rows) {
  if (!rows.length) {
    return { ok: false, error: "CSV is empty." };
  }
  const header = rows[0].map((cell) => cell.toLowerCase());
  const required = ["level", "question", "a", "b", "c", "d", "correct"];
  const missing = required.filter((col) => !header.includes(col));
  if (missing.length) {
    return { ok: false, error: `Missing columns: ${missing.join(", ")}` };
  }
  const idx = (name) => header.indexOf(name);
  const data = rows.slice(1);
  const questions = [];
  for (let i = 0; i < data.length; i += 1) {
    const row = data[i];
    const level = Number(row[idx("level")]);
    const prompt = row[idx("question")];
    const correct = row[idx("correct")].toUpperCase();
    if (!Number.isInteger(level) || level < 1 || level > 15) {
      return { ok: false, error: `Row ${i + 2}: level must be 1-15.` };
    }
    if (!prompt) {
      return { ok: false, error: `Row ${i + 2}: question is empty.` };
    }
    if (!["A", "B", "C", "D"].includes(correct)) {
      return { ok: false, error: `Row ${i + 2}: correct must be A-D.` };
    }
    questions.push({
      level,
      type: "MCQ",
      promptText: prompt,
      options: {
        A: row[idx("a")],
        B: row[idx("b")],
        C: row[idx("c")],
        D: row[idx("d")]
      },
      correctOption: correct,
      explanation: row[idx("explanation")] || ""
    });
  }
  const levels = new Set(questions.map((q) => q.level));
  if (levels.size !== 15) {
    return { ok: false, error: "CSV must include exactly 15 unique levels." };
  }
  return { ok: true, questions };
}

export function pickAudiencePoll(level) {
  const base = 65 - level * 2;
  const correct = Math.max(35, Math.min(80, base + Math.floor(Math.random() * 10)));
  const remaining = 100 - correct;
  const dist = [
    Math.floor(remaining * 0.5),
    Math.floor(remaining * 0.3),
    remaining - Math.floor(remaining * 0.5) - Math.floor(remaining * 0.3)
  ];
  return { correct, dist };
}

export function phoneFriendHint(level, correctOption) {
  const reliability = Math.max(35, 80 - level * 3);
  const isCorrect = Math.random() * 100 < reliability;
  const hint = isCorrect ? correctOption : ["A", "B", "C", "D"].filter((c) => c !== correctOption)[Math.floor(Math.random() * 3)];
  return { hint, reliability };
}
