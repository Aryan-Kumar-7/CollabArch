export class CreateCommentDto {
  content!: string;
  parentId?: string;
  nodeId?: string;
  posX?: number;
  posY?: number;
}
