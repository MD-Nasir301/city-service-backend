
import { Priority } from "../../../generated/prisma/enums";

export interface ICreateServiceRequestInput {
  categoryId: string;
  title: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  priority?: Priority;
  quantity?: number;
}