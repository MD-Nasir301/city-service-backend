

export interface ICreateCommentInput {
  serviceRequestId: string;
  text: string;
  isInternal?: boolean;
}

export interface IUpdateCommentInput {
  text?: string;
  isInternal?: boolean;
}