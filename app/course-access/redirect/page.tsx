import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {getCourseDriveUrl, getValidCourseAccessRecord} from '@/lib/course-access';
import {CourseAccessNavigation} from './CourseAccessNavigation';

export const dynamic = 'force-dynamic';

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
	console.info('COURSE_ACCESS_DIAGNOSTIC', JSON.stringify({
		timestamp: new Date().toISOString(),
		route: '/course-access/redirect',
		method: 'GET',
		event,
		...fields,
	}));
}

export default async function CourseAccessRedirect() {
	const startedAt = Date.now();
	diagnostic('INTERSTITIAL_START');
	const session = (await cookies()).get('course_access_session')?.value;
	if (!session) {
		diagnostic('INTERSTITIAL_SESSION_MISSING');
		redirect('/course-access?state=invalid');
	}

	let authorized = false;
	let destination: string | undefined;
	let validationFailed = false;
	try {
		authorized = Boolean(await getValidCourseAccessRecord(undefined, session));
		if (authorized) destination = getCourseDriveUrl().toString();
	} catch {
		validationFailed = true;
	}
	diagnostic('INTERSTITIAL_VALIDATION_END', {
		durationMs: Date.now() - startedAt,
		authorized,
	});

	if (!authorized || !destination) {
		if (validationFailed) redirect('/course-access?state=error');
		redirect('/course-access?state=invalid');
	}

	diagnostic('INTERSTITIAL_NAVIGATION', {durationMs: Date.now() - startedAt});
	return <CourseAccessNavigation destination={destination}/>;
}