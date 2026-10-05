import {cookies} from 'next/headers';
import {BookOpen, Check, Clock3, GraduationCap} from 'lucide-react';
import {COURSE_NAME, getPaymentByTokenHash, hashAccessToken} from '@/lib/course-access';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'Course access | CampusEduX', robots: {index: false, follow: false}};

export default async function CourseAccess({searchParams}: {searchParams: {state?: string}}) {
	const accessToken = cookies().get('course_access_token')?.value;
	const sessionToken = cookies().get('course_access_session')?.value;
	let hasAccess = false;
	let serverError = searchParams.state === 'error';
	if (accessToken || sessionToken) {
		try {
			hasAccess = Boolean(accessToken
				? await getPaymentByTokenHash('access_token_hash', hashAccessToken(accessToken), 'access_token_expires_at')
				: await getPaymentByTokenHash('access_session_hash', hashAccessToken(sessionToken!), 'access_session_expires_at'));
		} catch (error) {
			console.error('Course access session lookup failed', error);
			serverError = true;
		}
	}

	return <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
		<div className="mx-auto max-w-2xl">
			<a href="/courses/share-market-complete-course" className="text-sm font-bold text-green-800">CampusEduX</a>
			<section className="mt-8 rounded-xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
				{hasAccess ? <>
					<p className="flex items-center gap-2 font-bold text-green-800"><Check size={20}/>Payment Successful</p>
					<h1 className="mt-3 text-3xl font-black">Thank you for purchasing<br/>Share Market Complete Course</h1>
					<p className="mt-3 font-bold text-green-800">₹499 Payment Verified</p>
					<p className="muted mt-3">Your course is ready. Your course access has been securely verified.</p>
					<div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
						<p className="flex items-center gap-3 py-4"><BookOpen size={19} className="text-green-700"/><span>{COURSE_NAME}</span></p>
						<p className="flex items-center gap-3 py-4"><Clock3 size={19} className="text-green-700"/><span><strong>Duration:</strong> 13+ Hours</span></p>
						<p className="flex items-center gap-3 py-4"><GraduationCap size={19} className="text-green-700"/><span><strong>Access:</strong> Beginner → Advanced</span></p>
						<p className="py-4 font-semibold text-slate-700">Lifetime Course Access</p>
					</div>
					<form action="/api/course-access/open" method="post" className="mt-8">
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