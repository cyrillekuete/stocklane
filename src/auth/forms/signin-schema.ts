import { z } from 'zod';

export const getSigninSchema = (t: (id: string) => string = (id) => id) => {
  return z.object({
    email: z
      .string()
      .email({ message: t('Please enter a valid email address.') })
      .min(1, { message: t('Email is required.') }),
    password: z.string().min(1, { message: t('Password is required.') }),
    rememberMe: z.boolean().optional(),
  });
};

export type SigninSchemaType = z.infer<ReturnType<typeof getSigninSchema>>;
