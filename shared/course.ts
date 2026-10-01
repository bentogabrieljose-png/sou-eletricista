export const PRACTICAL_LESSONS_URL = "https://drive.google.com/drive/folders/1iY9KFHTVUzvBZyYjrTdJtvotqePH37vC";
export const COURSE_LESSON_URL = "https://share.minicoursegenerator.com/eletricidade-basica-para-instalacoes-residenciais-em-baixa-tensao-dc8d9d";
export const EXAM_UNLOCK_DELAY_MS = 12 * 60 * 60 * 1000;
export function examUnlockAt(approvedAt: Date) { return new Date(approvedAt.getTime() + EXAM_UNLOCK_DELAY_MS); }

export const EXAM_QUESTIONS = [
  { id: 1, question: "Qual é a unidade de medida da tensão elétrica?", options: ["Ampere", "Volt", "Ohm", "Watt"] },
  { id: 2, question: "Qual equipamento protege uma instalação contra sobrecarga e curto-circuito?", options: ["Disjuntor", "Interruptor simples", "Tomada", "Lâmpada"] },
  { id: 3, question: "Qual é a função principal do fio de proteção (terra)?", options: ["Aumentar a tensão", "Reduzir o consumo", "Conduzir correntes de fuga com segurança", "Substituir o neutro"] },
  { id: 4, question: "Antes de intervir num circuito, o profissional deve primeiro:", options: ["Molhar as mãos", "Desligar e confirmar a ausência de tensão", "Trocar a lâmpada", "Aumentar o disjuntor"] },
  { id: 5, question: "A corrente elétrica é medida em:", options: ["Volts", "Ohms", "Amperes", "Hertz"] },
  { id: 6, question: "O interruptor diferencial residual ajuda a proteger principalmente contra:", options: ["Fugas de corrente e choque elétrico", "Falta de iluminação", "Ruído", "Baixa pressão"] },
  { id: 7, question: "Uma ligação bem apertada e isolada ajuda a evitar:", options: ["Aquecimento e mau contacto", "Aumento da humidade", "Perda de cor", "Ruído mecânico"] },
  { id: 8, question: "O neutro de uma instalação residencial normalmente serve para:", options: ["Completar o circuito de retorno", "Substituir o disjuntor", "Ligar a carcaça", "Aumentar a frequência"] },
  { id: 9, question: "O que deve ser usado para testar a presença de tensão?", options: ["Ferramenta adequada e isolada", "Qualquer objeto metálico", "A mão", "Água"] },
  { id: 10, question: "As cores dos condutores devem ser respeitadas porque:", options: ["Facilitam a identificação e aumentam a segurança", "Deixam o cabo mais comprido", "Reduzem a frequência", "Substituem a proteção"] },
] as const;

export const ANSWER_KEY = [1, 0, 2, 1, 2, 0, 0, 0, 0, 0] as const;

export type CourseExamQuestion = { question: string; options: [string, string, string, string]; correctIndex: number };

export function scoreExam(answers: number[], key: readonly number[] = ANSWER_KEY) {
  if (answers.length !== 10 || key.length !== 10) throw new Error("A avaliação deve conter 10 respostas.");
  return Math.round(answers.reduce((total, answer, index) => total + (answer === key[index] ? 10 : 0), 0));
}
