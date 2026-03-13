
export interface CreateContact {
    id?: number | string;  
  companyName: string;
  subCompanyName?: string;
  branchName?: string;
  personName: string;
  designation?: string;
  phoneNumber1?: string;
  phoneNumber2?: string;
  phoneNumber3?: string;
  email1?: string;
  email2?: string;
  address?: string;
  servicesCsv?: string;
  website1?: string;
  website2?: string;
  rawExtractedText?: string;
  imageAsString?: string;
  mimeType?: string;
  frontImageAsString: string;
  frontImageMimeType: string;
  backImageAsString: string;
  backImageMimeType: string;
  frontImage?: string;
  backImage?: string;
}

export interface ContactDetail extends CreateContact {
  id: number | string;
  userId: string;
  user?: any;
  createdAtUtc: string;
  image?: string;
}

export interface PaginatedContacts {
  total: number;
  page: number;
  pageSize: number;
  items: ContactDetail[];
}
