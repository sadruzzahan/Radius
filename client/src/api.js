const API_URL = import.meta.env.VITE_API_URL ?? "";

export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, options = {}, token = "") {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
      ...(options.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    let errMsg = body.error ?? `Request failed: ${response.status}`;
    if (body.details && Array.isArray(body.details)) {
      errMsg += ": " + body.details.map(d => `${d.path.join('.')}: ${d.message}`).join(", ");
    }
    throw new Error(errMsg);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function uploadFile(path, file, token = "") {
  const body = new FormData();
  body.append("photo", file);
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: authHeaders(token),
    body
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? `Upload failed: ${response.status}`);
  }
  return response.json();
}

export { API_URL };
