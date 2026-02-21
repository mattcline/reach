import { UserProfileAbbreviated } from "./user";

export interface IComment {
  id: string;
  content: string;
  timestamp: string;
  text: {
    id: string;
  }
  author: UserProfileAbbreviated;
}

export interface ICommentPopoverContext {
  comments: IComment[] | null;
  setComments: React.Dispatch<React.SetStateAction<IComment[] | null>>;
  deleteComment: (comment: IComment) => void;
}