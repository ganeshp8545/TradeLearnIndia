import {cookies} from 'next/headers';
import {BookOpen, Clock3, GraduationCap} from 'lucide-react';
import {COURSE_NAME, getPaymentByTokenHash, hashAccessToken} from '@/lib/course-access';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Course access | CampusEduX', robots: {index: false, follow: false}};

export default async function CourseAccess({searchParams}: {searchParams: {state?: string}}) {
	const sessionToken = cookies().get('course_access_session')?.value;
	let hasAccess = false;
	let serverError = searchParams.state === 'error';
	if (sessionToken) {
		try {
			hasAccess = Boolean(await getPaymentByTokenHash('access_session_hash', hashAccessToken(sessionToken), 'access_session_expires_at'));
		} catch (error) {
			console.error('Course access session lookup failed', error);
			serverError = true;
		}
	}

	const driveUrl = hasAccess ? process.env.COURSE_DRIVE_URL : undefined;
	if (hasAccess && !driveUrl) serverError = true;

	return <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
		<div className="mx-auto max-w-2xl">
			<a href="/courses/share-market-complete-course" className="text-sm font-bold text-green-800">CampusEduX</a>
			<section className="mt-8 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
				{hasAccess && driveUrl ? <>
					<p className="font-bold text-green-800">🎉 Payment Successful</p>
					<h1 className="mt-3 text-3xl font-black">Your Share Market Complete Course is ready.</h1>
					<div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
						<p className="flex items-center gap-3 py-4"><BookOpen size={19} className="text-green-700"/><span><strong>Course:</strong> {COURSE_NAME}</span></p>
						<p className="flex items-center gap-3 py-4"><Clock3 size={19} className="text-green-700"/><span><strong>Duration:</strong> 13+ Hours</span></p>
						<p className="flex items-center gap-3 py-4"><GraduationCap size={19} className="text-green-700"/><span><strong>Access:</strong> Beginner → Advanced</span></p>
					</div>
					<a className="btn btn-primary mt-8 w-full sm:w-auto" href={driveUrl} target="_blank" rel="noopener noreferrer">🎓 ACCESS YOUR COURSE</a>
				</> : <>
					<h1 className="text-2xl font-black">{serverError ? 'Server error' : 'Invalid access'}</h1>
					<p className="muted mt-3 leading-7">{serverError
						? 'We could not verify course access right now. Please try again later or contact support.'
						: 'This course-access link is invalid or expired. Request a new secure link from the payment confirmation page.'}</p>
					<a className="btn btn-dark mt-6" href="/courses/share-market-complete-course">Return to course page</a>
				</>}
			</section>
		</div>
	</main>;
}