import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useConvertInvoice() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Direct fetch because we need to handle binary blob response
      const res = await fetch(api.convert.path, {
        method: api.convert.method,
        body: formData,
        // Don't set Content-Type header manually for FormData, browser does it
      });

      if (!res.ok) {
        let errorMessage = "Conversion failed";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If response isn't JSON, use status text
          errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
      }

      // Return blob for PDF
      return await res.blob();
    },
  });
}
