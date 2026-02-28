export type XubioTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type XubioInvoicePayload = {
  orderId: string;
  customer: {
    name: string;
    email: string;
    cuit?: string | null;
  };
  items: Array<{
    externalProductId?: number | null;
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
};

export type XubioInvoiceResponse = {
  id: string;
  cae: string;
  pdf_url: string;
};
