'use client';

import {useState} from 'react';
import {ChevronDown, Clock3} from 'lucide-react';
import type {CourseModule} from '@/lib/course-page-data';
import styles from './CourseLandingPage.module.css';

export function CourseCurriculum({modules}: {modules: CourseModule[]}) {
	const [openModule, setOpenModule] = useState<number | null>(0);

	return <div className={styles.accordionList}>{modules.map((module, moduleIndex) => {
		const isOpen = openModule === moduleIndex;
		const lessonOffset = modules.slice(0, moduleIndex).reduce((count, previous) => count + previous.lessons.length, 0);
		const lessonLabel = module.lessons.length === 1 ? '1 lesson' : `${module.lessons.length} lessons`;
		const panelId = `course-module-${moduleIndex}`;

		return <section key={module.title} className={styles.accordion}>
			<button type="button" className={styles.accordionTrigger} aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpenModule(isOpen ? null : moduleIndex)}>
				<span className={styles.moduleNumber}>{String(moduleIndex + 1).padStart(2, '0')}</span>
				<span className={styles.moduleTitle}>{module.title}</span>
				<span className={styles.moduleMeta}>{lessonLabel}</span>
				<ChevronDown size={19} aria-hidden="true"/>
			</button>
			<ol id={panelId} className={styles.lessonList} hidden={!isOpen}>
				{module.lessons.map((lesson, lessonIndex) => <li key={lesson.title}>
					<span className={styles.lessonNumber}>{lessonOffset + lessonIndex + 1}</span>
					<span className={styles.lessonName}>{lesson.title}{(lesson.freePreview ?? false) && <span className={styles.previewBadge}>Free preview</span>}</span>
					{lesson.duration && <span className={styles.lessonDuration}><Clock3 size={14} aria-hidden="true"/>{lesson.duration}</span>}
				</li>)}
			</ol>
		</section>;
	})}</div>;
}