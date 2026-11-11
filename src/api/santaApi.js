
const API_URL = "/api";

async function request(url, options = {}) {
  const response = await fetch(`${API_URL}${url}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Ошибка сервера");
  }

  return data;
}

export function getParticipants() {
  return request("/participants");
}

export function getRouletteStatus(userId) {
  return request(`/roulette/${encodeURIComponent(userId)}/status`);
}

export function spinRoulette(userId) {
  return request(`/roulette/${encodeURIComponent(userId)}/spin`, {
    method: "POST"
  });
}

export function saveParticipantEmail(userId, email) {
  return request(
    `/participants/${encodeURIComponent(userId)}/email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    }
  );
}
