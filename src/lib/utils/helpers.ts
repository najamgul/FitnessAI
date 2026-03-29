/**
 * Parses a time string in "HH:MM AM/PM" format to a Date object.
 * Uses a fixed reference date (epoch) so only the time portion matters.
 * This is primarily used for sorting meals by time.
 */
export const parseTime = (timeStr: string): Date => {
    const referenceDate = new Date(0);
    if (typeof timeStr !== 'string' || !timeStr.includes(' ')) {
        return referenceDate;
    }
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (hours === 12) {
        hours = modifier?.toUpperCase() === 'AM' ? 0 : 12;
    } else if (modifier?.toUpperCase() === 'PM') {
        hours += 12;
    }

    referenceDate.setHours(hours || 0, minutes || 0, 0, 0);
    return referenceDate;
};

/**
 * Basic text sanitizer for user inputs that will be stored in Firestore
 * or interpolated into AI prompts. Strips script tags and trims whitespace.
 */
export const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') return '';
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
};

/**
 * Cleans up old localStorage entries (e.g., mealProgress_*) that are older than a given number of days.
 */
export const cleanupOldLocalStorageEntries = (prefix: string, maxAgeDays: number = 7): void => {
    if (typeof window === 'undefined') return;
    
    const today = new Date();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            const dateStr = key.replace(prefix, '');
            const entryDate = new Date(dateStr);
            if (!isNaN(entryDate.getTime())) {
                const diffDays = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays > maxAgeDays) {
                    keysToRemove.push(key);
                }
            }
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
};
