const TOKEN_KEY = "vaanibill_token";
const BUSINESS_KEY = "vaanibill_business";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function setBusinessName(name: string) {
  localStorage.setItem(BUSINESS_KEY, name);
}

export function getBusinessName() {
  return localStorage.getItem(BUSINESS_KEY) || "";
}

export function clearBusinessName() {
  localStorage.removeItem(BUSINESS_KEY);
}
