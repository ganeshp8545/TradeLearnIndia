'use client';

import {useEffect, useState} from 'react';
import {CalendarDays} from 'lucide-react';
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
		<span className={styles.stickyPrice}><span>{label.replace('Enroll Now – ', '')}</span></span>
		<a href="#enrol" className="btn btn-gold">{label}</a>
	</div>;
}

export function OfferCountdown({endDate}: {endDate: string}) {
	const [remaining, setRemaining] = useState('');

	useEffect(() => {
		const deadline = new Date(endDate).getTime();
		if (!Number.isFinite(deadline)) return;
		const update = () => {
			const milliseconds = Math.max(0, deadline - Date.now());
			const days = Math.floor(milliseconds / 86_400_000);
			const hours = Math.floor((milliseconds % 86_400_000) / 3_600_000);
			const minutes = Math.floor((milliseconds % 3_600_000) / 60_000);
			setRemaining(milliseconds === 0 ? 'Offer period has ended' : `${days}d ${hours}h ${minutes}m remaining`);
		};
		update();
		const interval = window.setInterval(update, 60_000);
		return () => window.clearInterval(interval);
	}, [endDate]);

	return <p className={styles.offerCountdown}><CalendarDays size={15} aria-hidden="true"/><span aria-live="polite">{remaining || `Offer ends ${new Date(endDate).toLocaleDateString('en-IN')}`}</span></p>;
}
