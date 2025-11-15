export class Category {
  id: number;
  nameUz: string;
  nameEn: string | null;
  nameRu: string | null;
  slug: string;
  icon: string | null;
  description: string | null;
  parentId: number | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent?: Category | null;
  children?: Category[];
}
