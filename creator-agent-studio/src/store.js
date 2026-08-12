import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export class DraftStore {
  constructor(file) { this.file = file; }
  async read() {
    try { return JSON.parse(await readFile(this.file, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return []; throw error; }
  }
  async write(items) {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(items, null, 2), "utf8");
    await rename(tmp, this.file);
  }
  async list() { return (await this.read()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
  async save(input) {
    const items = await this.read();
    const now = new Date().toISOString();
    const item = { ...input, id: input.id || crypto.randomUUID(), updatedAt: now, createdAt: input.createdAt || now };
    const index = items.findIndex(x => x.id === item.id);
    if (index >= 0) items[index] = item; else items.push(item);
    await this.write(items);
    return item;
  }
  async remove(id) {
    const items = await this.read();
    const next = items.filter(x => x.id !== id);
    if (next.length === items.length) return false;
    await this.write(next); return true;
  }
}
