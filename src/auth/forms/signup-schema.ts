import { z } from 'zod';

export const getSignupSchema = (t: (id: string) => string = (id) => id) => {
  return z
    .object({
      email: z
        .string()
        .email({ message: t('Please enter a valid email address.') })
        .min(1, { message: t('Email is required.') }),
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
      firstName: z.string().min(1, { message: t('First name is required.') }),
      lastName: z.string().min(1, { message: t('Last name is required.') }),
      terms: z.boolean().refine((val) => val === true, {
        message: t('You must agree to the terms and conditions.'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("Passwords don't match"),
      path: ['confirmPassword'],
    });
};

export type SignupSchemaType = z.infer<ReturnType<typeof getSignupSchema>>;
