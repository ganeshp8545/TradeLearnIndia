import {CourseRecoveryConfirm} from '@/components/CourseRecovery';

export const metadata = {title: 'Recover course access | CampusEduX', robots: {index: false, follow: false}, referrer: 'no-referrer' as const};
export default function RecoverCourse() {
    return <main className="min-h-[calc(100dvh-64px)] bg-slate-50 px-4 py-10"><CourseRecoveryConfirm/></main>;
}
