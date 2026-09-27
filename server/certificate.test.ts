import { describe, expect, it } from "vitest";
import {
  CERTIFICATE_CENTER_NAME,
  CERTIFICATE_DIRECTOR_NAME,
  CERTIFICATE_DURATION_HOURS,
} from "../shared/certificate";

describe("certificate model", () => {
  it("uses the official 72-hour duration and director-only signature", () => {
    expect(CERTIFICATE_DURATION_HOURS).toBe(72);
    expect(CERTIFICATE_DIRECTOR_NAME).toBe("Gabriel Carlos Cambinza");
    expect(CERTIFICATE_CENTER_NAME).toBe("Sou Eletricista");
  });
});
