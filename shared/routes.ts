import { z } from 'zod';

export const api = {
  convert: {
    method: 'POST' as const,
    path: '/api/convert',
    // Input is multipart/form-data, handled specially in implementation
    responses: {
      200: z.any(), // Returns binary PDF
      400: z.object({ message: z.string() }),
      500: z.object({ message: z.string() }),
    },
  },
};
