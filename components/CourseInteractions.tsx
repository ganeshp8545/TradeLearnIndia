'use client';

import {useEffect, useState} from 'react';
import styles from './CourseLandingPage.module.css';

export function StickyCourseCTA({label}: {label: string}) {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const targets = ['#course-hero-enroll', '#course-pricing-card-cta', '#course-final-cta']
			.map((selector) => document.querySelector(selector))
			.filter((element): element is Element => element instanceof Element);
		if (targets.length === 0) return;

		const observer = new IntersectionObserver((entries) => {
			const visibleTarget = entries.some((entry) => entry.isIntersecting);
			setIsVisible(!visibleTarget);
		}, {threshold: [0, 0.1]});

		targets.forEach((target) => observer.observe(target));
		return () => observer.disconnect();
	}, []);

	return <div className={`${styles.stickyCta} ${isVisible ? styles.stickyCtaVisible : ''}`} aria-hidden={!isVisible}>
		<span className={styles.stickyPrice}><strong>{label.replace('Enroll Now – ', '')}</strong><span>11 video lessons</span></span>
		<a href="#enrol" tabIndex={isVisible ? 0 : -1} className="btn btn-gold">View checkout</a>
	</div>;
}
