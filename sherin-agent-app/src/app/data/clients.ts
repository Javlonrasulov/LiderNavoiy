export interface Client {
  id: number;
  code: string;
  name: string;
  subtitle: string;
  address: string;
  balance: number;
  day: string;
  phone?: string;
  company?: string;
  category?: string;
  lat?: number;
  lng?: number;
}

export const clients: Client[] = [
  { id: 1, code: "29072", name: "XOLMURODOVA SABRINA MIRO", subtitle: "Magistral pizza aeroportda tras...", address: "01 - Тошшироб;...", balance: -862.96, day: 'monday' },
  { id: 2, code: "29047", name: "YANGI ASR 777' OK", subtitle: "Magistral pizza aeroportda tras...", address: "01 - Тошшироб;...", balance: -343.12, day: 'monday' },
  { id: 3, code: "29043", name: "AZIZOVA VAZIRA MEHRIDDINOVA", subtitle: "", address: "01 - Тошшироб;...", balance: -471489.12, day: 'monday' },
  { id: 4, code: "29022", name: "GO ZAL TONG NURAPSONI", subtitle: "", address: "01 - Тошшироб;...", balance: 0.00, day: 'monday' },
  { id: 5, code: "29019", name: "SHAROPOV SHAROF YATT", subtitle: "АҲИМОВ ШАХЗОД ҒНИЗА", address: "01 - Тошшироб;...", balance: -720.89, day: 'monday' },
  { id: 6, code: "29012", name: "Муҳаммадиев Норир", subtitle: "Меҳр маркази", address: "01 - Тошшироб;...", balance: 191748.74, day: 'tuesday' },
  { id: 7, code: "29011", name: "QIZILTEPA ULGURLJ CHAKANA SAV...", subtitle: "Оператир центр", address: "01 - Тошшироб;...", balance: 0.00, day: 'tuesday' },
  { id: 8, code: "29008", name: "ABUXAMIDOVA SHAXZODABONU", subtitle: "ЭЛЕКТРОХИМИЯ УГЛИ", address: "01 - Тошшироб;...", balance: -799997.9, day: 'wednesday' },
];
