import z from "zod";

const CreateCommentZodSchema = z.object({
  serviceRequestId: z.string({
    message: "Service Request ID is required.",
  }),
  text: z
    .string({
      message: "Comment text must be a string.",
    })
    .min(1, { message: "Comment text cannot be empty." }),
  isInternal: z.boolean().optional(),
});

export const CommentValidation = {
  CreateCommentZodSchema,
};
