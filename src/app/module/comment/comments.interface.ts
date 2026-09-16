

export interface ICreateCommentInput {
  serviceRequestId: string;
  text: string;
  isInternal?: boolean;
}