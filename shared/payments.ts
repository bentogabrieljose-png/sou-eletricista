export const PAYMENT_OPTIONS = [
  ["PayPay AO", "Entidade: 10116", "Referência: 947227693"],
  ["Multicaixa Express", "+244 947 227 693"],
  ["IBAN Angola", "0040 0000 6087 3084 1021 5"],
  ["IBAN Europa", "CARLOS CAMBINZA GABRIEL JOSE", "LU404080000045240984", "SWIFT: BCIRLULL"],
] as const;

export const CERTIFICATE_REPRINT_FEES = [
  { amount: 2000, currency: "Kz", label: "2.000 Kz" },
  { amount: 3, currency: "EUR", label: "3 euros" },
] as const;
