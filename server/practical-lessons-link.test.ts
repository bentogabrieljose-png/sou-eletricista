import { describe, expect, it } from "vitest";
import { PRACTICAL_LESSONS_URL } from "../shared/course";

describe("Aulas práticas", () => {
  it("uses the official Google Drive folder", () => {
    expect(PRACTICAL_LESSONS_URL).toBe("https://drive.google.com/drive/folders/1PMYSZT335qZ0ijuuw5IEYwZEBnhdfKp2");
  });
});
