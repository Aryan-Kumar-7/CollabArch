export class CreateRevisionDto {
  name?: string;
  description?: string;
  documentBlob?: string; // Optional Base64 binary snapshot
}
