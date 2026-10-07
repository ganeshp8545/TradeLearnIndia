export const COURSE_NAME = 'Share Market Complete Course';
export const COURSE_SLUG = 'share-market-complete-course';
export const COURSE_PRICE_INR = 499;
export const COURSE_ORIGINAL_PRICE_INR = 1900;
export const COURSE_PRICE_PAISE = COURSE_PRICE_INR * 100;
export const COURSE_PRICE_SAVING_INR = COURSE_ORIGINAL_PRICE_INR - COURSE_PRICE_INR;
export const TEST_COURSE_PRICE_INR = COURSE_PRICE_INR;

export function formatINR(amount: number): string {
	return `₹${new Intl.NumberFormat('en-IN').format(amount)}`;
}
