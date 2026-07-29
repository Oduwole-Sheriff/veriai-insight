import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().trim().min(20).max(8000),
});

export const verifyContentLive = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const { runLiveVerification } = await import("./verify.pipeline");
    return runLiveVerification(data.text);
  });
