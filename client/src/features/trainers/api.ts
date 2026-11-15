import { httpClient } from "../../shared/http/httpClient";
import type { Trainer } from "../../types";

export async function getTrainers(): Promise<Trainer[]> {
  const response = await httpClient.get("/trainers");
  return response.data;
}

export async function createTrainer(name: string, phone: string, email: string): Promise<Trainer> {
  const response = await httpClient.post("/trainers", { name, phone, email });
  return response.data;
}

export async function updateTrainer(
  id: number,
  name: string,
  phone: string,
  email: string,
): Promise<Trainer> {
  const response = await httpClient.put(`/trainers/${id}`, { name, phone, email });
  return response.data;
}

export async function deleteTrainer(id: number): Promise<{ message: string }> {
  const response = await httpClient.delete(`/trainers/${id}`);
  return response.data;
}
