import { randomUUID } from 'crypto';

export const randomId = () => randomUUID().split('-').slice(0, 2).join('');
