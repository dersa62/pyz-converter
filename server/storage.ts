import { normalizedInvoiceSchema } from "@shared/schema";

export interface IStorage {
  // We don't need persistent storage for this stateless tool, 
  // but we implement the interface for consistency.
}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();
