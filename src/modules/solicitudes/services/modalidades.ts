export type ModalidadPedido = "CV" | "CH" | "ALQ" | "CONTADO";

export type ModalidadOption = {
  value: ModalidadPedido;
  label: string;
  title: string;
  description: string;
  badgeClassName: string;
  cardClassName: string;
  iconClassName: string;
};

export const MODALIDADES_PEDIDO: ModalidadOption[] = [
  {
    value: "CV",
    label: "C/V",
    title: "Compra y vende",
    description: "Cliente que compra ligado a una venta.",
    badgeClassName: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-300",
    cardClassName: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    iconClassName: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "CH",
    label: "C/H",
    title: "Compra con hipoteca",
    description: "Operacion sujeta a financiacion.",
    badgeClassName: "bg-blue-100 text-blue-700 dark:bg-blue-900/35 dark:text-blue-300",
    cardClassName: "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    iconClassName: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  },
  {
    value: "ALQ",
    label: "ALQ",
    title: "Alquiler",
    description: "Busqueda orientada a alquiler.",
    badgeClassName: "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-300",
    cardClassName: "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    iconClassName: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  {
    value: "CONTADO",
    label: "Al contado",
    title: "Pago al contado",
    description: "Cliente fuerte con liquidez inmediata.",
    badgeClassName: "bg-success/12 text-success",
    cardClassName: "border-success/40 bg-success/10 text-success",
    iconClassName: "bg-success/12 text-success",
  },
];

export function getModalidadOption(value: string | null | undefined) {
  return MODALIDADES_PEDIDO.find((option) => option.value === value);
}

export function formatModalidadPedido(value: string | null | undefined) {
  return getModalidadOption(value)?.title ?? value ?? "-";
}
