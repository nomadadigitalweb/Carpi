export type OrderStatus =
  | "pendiente_fabricante"
  | "aprobado"
  | "facturado"
  | "pagado"
  | "rechazado"
  | "cancelado";

export type ShippingStatus = "preparando" | "despachado" | "entregado";

export type CartLine = {
  productId: string;
  quantity: number;
};

export type ResolvedOrderLine = {
  productId: string;
  productName: string;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
};

export type InvoiceResult = {
  invoiceId: string;
  cae: string;
  pdfUrl: string;
};
