import { getToken } from "./auth";

const API_BASE = "/api";

async function request<T>(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message || "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  login: (body: { username: string; password: string }) =>
    request<{ token: string; businessName: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  signup: (body: { username: string; password: string; businessName: string }) =>
    request<{ token: string; businessName: string }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  me: () => request<{ username: string; businessName: string }>("/me"),
  listProducts: () =>
    request<Array<{ id: number; nameEn: string; nameGu: string; rate: number }>>("/products"),
  addProduct: (body: { nameEn: string; nameGu: string; rate: number }) =>
    request<{ id: number }>("/products", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  updateProduct: (id: number, body: { nameEn: string; nameGu: string; rate: number }) =>
    request("/products/" + id, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  deleteProduct: (id: number) =>
    request("/products/" + id, {
      method: "DELETE"
    }),
  saveBill: (body: {
    items: Array<{ name: string; rate: number; quantity: number; total: number }>;
    total: number;
  }) =>
    request<{ id: number; billNumber: string }>("/bills", {
      method: "POST",
      body: JSON.stringify(body)
    }),
  listBills: () =>
    request<
      Array<{
        id: number;
        billNumber: string;
        createdAt: string;
        total: number;
        items: Array<{ name: string; rate: number; quantity: number; total: number }>;
      }>
    >("/bills"),
  updateBill: (
    id: number,
    body: {
      items: Array<{ name: string; rate: number; quantity: number; total: number }>;
      total: number;
    }
  ) =>
    request("/bills/" + id, {
      method: "PUT",
      body: JSON.stringify(body)
    }),
  deleteBill: (id: number) =>
    request("/bills/" + id, {
      method: "DELETE"
    }),
  getReports: () =>
    request<{
      totals: { all: number; today: number; week: number };
      counts: { bills: number; items: number; todayBills: number; weekBills: number };
      topItems: Array<{ name: string; quantity: number; revenue: number }>;
    }>("/reports")
};
