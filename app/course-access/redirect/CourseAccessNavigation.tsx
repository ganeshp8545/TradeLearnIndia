'use client';

import {useEffect} from 'react';

export function CourseAccessNavigation({destination}: {destination: string}) {
	useEffect(() => {
		window.location.replace(destination);
	}, [destination]);

	return <main className="grid min-h-[calc(100dvh-64px)] place-items-center bg-slate-50 px-4 text-slate-900">
		<div className="text-center">
			<p role="status" className="font-semibold">Opening your course…</p>
			<a className="mt-4 inline-block font-bold text-green-800 underline" href={destination}>Continue to your course</a>
		</div>
	</main>;
}