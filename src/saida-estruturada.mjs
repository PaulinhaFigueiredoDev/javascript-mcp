import * as z from 'zod/v4';

export const enderecoOutputSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/),
  logradouro: z.string(),
  bairro: z.string(),
  cidade: z.string().min(1),
  uf: z.string().regex(/^[A-Z]{2}$/),
});

export const consultarCepOutputSchema = z.object({
  encontrado: z.boolean(),
  endereco: enderecoOutputSchema.nullable(),
});

export const buscarCepsOutputSchema = z.object({
  enderecos: z.array(enderecoOutputSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().min(0).max(49),
  limit: z.number().int().min(1).max(10),
  proximoOffset: z.number().int().nonnegative().nullable(),
});

export function paraEnderecoEstruturado({ cep, logradouro, bairro, localidade, uf }) {
  return { cep, logradouro, bairro, cidade: localidade, uf };
}
