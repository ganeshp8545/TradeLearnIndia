import {cookies} from 'next/headers';
import {BookOpen, Check, Clock3, GraduationCap} from 'lucide-react';
import {COURSE_NAME, COURSE_PRICE_INR, CourseAccessTimingEvent, formatINR, getValidCourseAccessRecord} from '@/lib/course-access';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Course access | CampusEduX', robots: {index: false, follow: false}};

function diagnostic(event: string, fields: Record<string, unknown> = {}) {
	console.info('COURSE_ACCESS_DIAGNOSTIC', JSON.stringify({
		timestamp: new Date().toISOString(),
		route: '/course-access',
		method: 'GET',
		event,
		...fields,
	}));
}

export default async function CourseAccess({searchParams}: {searchParams: Promise<{state?: string}>}) {
	const startedAt = Date.now();
	const timing = ({operation, durationMs, success}: CourseAccessTimingEvent) => {
		diagnostic('SUPABASE_OPERATION_END', {operation, durationMs, success});
	};
	diagnostic('PAGE_START');
	const [cookieStore, resolvedSearchParams] = await Promise.all([cookies(), searchParams]);
	const accessToken = cookieStore.get('course_access_token')?.value;
	const sessionToken = cookieStore.get('course_access_session')?.value;
	diagnostic('CREDENTIAL_TYPE_DETECTED', {
		rawTokenDetected: Boolean(accessToken),
		sessionDetected: Boolean(sessionToken),
	});
	let hasAccess = false;
	let serverError = resolvedSearchParams.state === 'error';
	if (accessToken || sessionToken) {
		try {
			const validationStartedAt = Date.now();
			diagnostic('SESSION_VALIDATION_START');
			hasAccess = Boolean(await getValidCourseAccessRecord(accessToken, sessionToken, timing));
			diagnostic('SESSION_VALIDATION_END', {
				durationMs: Date.now() - validationStartedAt,
				authorized: hasAccess,
			});
		} catch {
			diagnostic('SESSION_VALIDATION_ERROR');
			serverError = true;
		}
	}
	diagnostic('PAGE_END', {
		authorized: hasAccess,
		httpStatus: 200,
		redirectGenerated: false,
		totalDurationMs: Date.now() - startedAt,
	});

	return <main className="min-h-[calc(100dvh-64px)] bg-slate-50 px-4 py-10 text-slate-900 sm:py-12">
		<div className="mx-auto max-w-2xl">
			<a href="/courses/share-market-complete-course" className="text-sm font-bold text-green-800">CampusEduX</a>
			<section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				{hasAccess ? <>
					<p className="flex items-center gap-2 font-bold text-green-800"><Check size={20}/>Payment Successful</p>
					<h1 className="mt-3 text-3xl font-black">Thank you for purchasing<br/>Share Market Complete Course</h1>
					<p className="mt-3 font-bold text-green-800">{formatINR(COURSE_PRICE_INR)} Payment Verified</p>
					<p className="muted mt-3">Your course is ready. Your course access has been securely verified.</p>
					<div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
						<p className="flex items-center gap-3 py-4"><BookOpen size={19} className="text-green-700"/><span>{COURSE_NAME}</span></p>
						<p className="flex items-center gap-3 py-4"><Clock3 size={19} className="text-green-700"/><span><strong>Duration:</strong> 13+ Hours</span></p>
						<p className="flex items-center gap-3 py-4"><GraduationCap size={19} className="text-green-700"/><span><strong>Access:</strong> Beginner → Advanced</span></p>
						<p className="py-4 font-semibold text-slate-700">Lifetime Course Access</p>
					</div>
					<form action="/api/course-access/open" method="post" className="mt-6">
						<button className="btn btn-primary w-full sm:w-auto" type="submit">ACCESS YOUR COURSE</button>
					</form>
				</> : <>
					<h1 className="text-2xl font-black">{serverError ? 'Verification temporarily unavailable' : 'Payment verification required'}</h1>
					<p className="muted mt-3 leading-7">{serverError
						? 'We could not verify course access right now. Please try again later or contact support.'
						: 'A verified payment and valid access token are required to open the course.'}</p>
					<a className="btn btn-dark mt-6" href="/courses/share-market-complete-course">Return to course page</a>
				</>}
			</section>
		</div>
	</main>;
}
