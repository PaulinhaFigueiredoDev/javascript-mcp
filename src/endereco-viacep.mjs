import * as z from 'zod/v4';

export const enderecoViaCepSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/),
  logradouro: z.string(),
  bairro: z.string(),
  localidade: z.string().min(1),
  uf: z.string().regex(/^[A-Z]{2}$/),
});
