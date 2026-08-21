import { z } from 'zod';

export const getResetRequestSchema = (t: (id: string) => string = (id) => id) => {
  return z.object({
    email: z
      .string()
      .email({ message: t('Please enter a valid email address.') })
      .min(1, { message: t('Email is required.') }),
  });
};

export const getNewPasswordSchema = (t: (id: string) => string = (id) => id) => {
  return z
    .object({
      password: z
        .string()
        .min(6, { message: t('Password must be at least 6 characters.') })
        .regex(/[A-Z]/, {
          message: t('Password must contain at least one uppercase letter.'),
        })
        .regex(/[0-9]/, {
          message: t('Password must contain at least one number.'),
        }),
      confirmPassword: z.string().min(1, { message: t('Please confirm your password.') }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("Passwords don't match"),
      path: ['confirmPassword'],
    });
};

export type ResetRequestSchemaType = z.infer<ReturnType<typeof getResetRequestSchema>>;
export type NewPasswordSchemaType = z.infer<ReturnType<typeof getNewPasswordSchema>>;
