import fs from "node:fs/promises";
import path from "node:path";

export const readFile = (file: string) => fs.readFile(file, "utf8");

export const writeFile = async (file: string, code: string) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, code, "utf8");
};

export const changeExtension = (file: string, ext: string) =>
  `${file.replace(/\.[^.]+$/, "")}.${ext}`;
