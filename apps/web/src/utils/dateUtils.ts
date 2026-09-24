import { differenceInDays, differenceInMonths, differenceInYears } from 'date-fns';

export const formatPendingTime = (createdAt: string | Date, short: boolean = false) => {
 const start = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
 const now = new Date();
 
 const years = differenceInYears(now, start);
 const months = differenceInMonths(now, start) % 12;
 const startWithMonthsAndYears = new Date(start);
 startWithMonthsAndYears.setFullYear(start.getFullYear() + years);
 startWithMonthsAndYears.setMonth(start.getMonth() + months);
 const days = differenceInDays(now, startWithMonthsAndYears);

 if (short) {
 if (years > 0) return `${years}a ${months}m`;
 if (months > 0) return `${months}m ${days}d`;
 if (days > 0) return `${days}d`;
 return '<1d';
 }

 const parts = [];
 if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`);
 if (months > 0) parts.push(`${months} mês${months > 1 ? 'es' : ''}`);
 if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);
 
 if (parts.length === 0) return 'Menos de 1 dia';
 return parts.join(', ');
};
