import 'server-only';
import {takeCourseRateLimit} from '@/lib/course-access';

export async function limitCourseRequest(request: Request, scope: string, limit: number, seconds: number): Promise<boolean> {
    // Vercel overwrites this platform header. Other hosts use a shared bucket
    // until a trusted ingress IP source is explicitly configured.
    const identity = process.env.VERCEL === '1'
        ? (request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'unknown') : 'shared';
    const globalAllowed = await takeCourseRateLimit(`${scope}:global`, 'all', limit * 20, seconds);
    return globalAllowed && await takeCourseRateLimit(`${scope}:ip`, identity, limit, seconds);
}
