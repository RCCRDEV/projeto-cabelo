export interface Service {
  id: string;
  name: string;
  price: number;
  duration: number; // minutes
  description?: string;
}

export interface Barber {
  id: string;
  name: string;
  calendarId: string;
  avatar?: string;
}

export type PaymentMethodId = 'pix' | 'card' | 'cash';

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
}

export const services: Service[] = [
  {
    id: 'barba',
    name: 'Barba',
    price: 50.00,
    duration: 30,
    description: 'BARBA + vapor : tudo que tem na Expressa + hidratante para barba + vapor de ozônio + hidratante'
  },
  {
    id: 'corte',
    name: 'Corte',
    price: 50.00,
    duration: 30,
    description: 'Experiência rápida, precisa e elegante'
  },
  {
    id: 'corte-barba',
    name: 'Corte + Barba',
    price: 100.00,
    duration: 60,
    description: 'Cuidado completo para o seu visual'
  },
  {
    id: 'sobrancelha',
    name: 'Sobrancelha',
    price: 20.00,
    duration: 15,
  }
];

export const barbers: Barber[] = [
  {
    id: 'barbeiro-1',
    name: 'João Silva',
    calendarId: process.env.GOOGLE_CALENDAR_ID_1 || '',
  },
  {
    id: 'barbeiro-2',
    name: 'Pedro Santos',
    calendarId: process.env.GOOGLE_CALENDAR_ID_2 || '',
  },
  {
    id: 'barbeiro-3',
    name: 'Carlos Oliveira',
    calendarId: process.env.GOOGLE_CALENDAR_ID_3 || '',
  },
];

export const paymentMethods: PaymentMethod[] = [
  {
    id: 'pix',
    name: 'Pix',
    description: 'Pagamento via Pix',
  },
  {
    id: 'card',
    name: 'Cartão',
    description: 'Crédito ou débito no local',
  },
  {
    id: 'cash',
    name: 'Dinheiro',
    description: 'Pagamento em dinheiro no local',
  },
];

export const products: Product[] = [
  {
    id: 'pomada-modeladora',
    name: 'Pomada Modeladora',
    category: 'Cabelo',
    description: 'Fixação e acabamento para o seu estilo no dia a dia.',
  },
  {
    id: 'po-modelador',
    name: 'Pó Modelador',
    category: 'Cabelo',
    description: 'Volume e textura com visual natural.',
  },
  {
    id: 'oleo-para-barba',
    name: 'Óleo para Barba',
    category: 'Barba',
    description: 'Nutrição e maciez para reduzir frizz e ressecamento.',
  },
  {
    id: 'balm-para-barba',
    name: 'Balm para Barba',
    category: 'Barba',
    description: 'Hidratação e alinhamento para a barba ficar no lugar.',
  },
  {
    id: 'shampoo-masculino',
    name: 'Shampoo Masculino',
    category: 'Cabelo',
    description: 'Limpeza e cuidado para manter o corte sempre em dia.',
  },
  {
    id: 'pos-barba',
    name: 'Loção Pós-Barba',
    category: 'Barba',
    description: 'Conforto e sensação refrescante após o barbear.',
  },
];
