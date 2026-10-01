export const TRAINING_PRICING = {
  promotionalKz: 4000,
  promotionalEuro: 4,
  standardKz: 6000,
  standardEuro: 6,
  promotionStart: "2026-10-01T00:00:00.000Z",
  promotionDays: 30,
} as const;

export function getTrainingPrice(now = new Date()) {
  const endsAt = new Date(TRAINING_PRICING.promotionStart);
  endsAt.setUTCDate(endsAt.getUTCDate() + TRAINING_PRICING.promotionDays);
  const promotional = now.getTime() < endsAt.getTime();
  return {
    promotional,
    amountKz: promotional ? TRAINING_PRICING.promotionalKz : TRAINING_PRICING.standardKz,
    amountEuro: promotional ? TRAINING_PRICING.promotionalEuro : TRAINING_PRICING.standardEuro,
    label: promotional ? "4.000 Kz / 4 € promocional" : "6.000 Kz / 6 €",
    endsAt,
  };
}
