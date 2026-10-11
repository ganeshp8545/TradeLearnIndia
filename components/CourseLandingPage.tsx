import Image from 'next/image';
import {
	ArrowRight, BadgeCheck, BookOpen, Check, ChevronDown, CreditCard, FileText,
	LockKeyhole, Mail, MessageCircle, Play, ShieldCheck, Wallet,
} from 'lucide-react';
import {RazorpayCheckoutButton} from '@/components/RazorpayCheckoutButton';
import {CourseCurriculum} from '@/components/CourseCurriculum';
import {coursePageData as data, formatCoursePrice, getVisibleCurriculum, getVisibleGallery, getVisibleInstructor} from '@/lib/course-page-data';
import {StickyCourseCTA} from '@/components/CourseInteractions';
import styles from './CourseLandingPage.module.css';
import {COURSE_VIDEO_COUNT} from '@/lib/course-pricing';

const visibleCurriculum = getVisibleCurriculum();
const moduleCount = visibleCurriculum.length;
const lessonCount = visibleCurriculum.reduce((count, module) => count + module.lessons.length, 0);

function SectionTitle({kicker, title, description}: {kicker: string; title: string; description?: string}) {
	return <div className={styles.sectionTitle}><p className={styles.kicker}>{kicker}</p><h2>{title}</h2>{description && <p className={styles.sectionDescription}>{description}</p>}</div>;
}

function PriceBlock({enrollLabel, compact = false, secureText = 'Secure checkout with Razorpay'}: {enrollLabel: string; compact?: boolean; secureText?: string}) {
	return <div className={`${styles.priceBlock} ${compact ? styles.priceBlockCompact : ''}`}>
		<p className={styles.currentPrice}>{formatCoursePrice(data.pricing.priceInr)}</p>
		<p className={styles.priceCaption}>One payment · {COURSE_VIDEO_COUNT} pre-recorded videos</p>
		<div id={compact ? undefined : 'course-hero-enroll'}><RazorpayCheckoutButton label={enrollLabel} className="btn btn-gold w-full"/></div>
		<p className={styles.secureNote}><LockKeyhole size={14} aria-hidden="true"/>{secureText}</p>
	</div>;
}

function ChartPreview({title}: {title: string}) {
	return <div className={styles.chartPreview} role="img" aria-label={`${title}, illustrative chart only; not a course preview`}>
		<div className={styles.chartMeta}><span>ILLUSTRATIVE CHART</span><span className={styles.chartDot}/></div>
		<svg viewBox="0 0 420 190" aria-hidden="true" className={styles.chartSvg}>
			<path d="M0 35H420M0 80H420M0 125H420M0 170H420" className={styles.chartGrid}/>
			<path d="M14 148L52 130L80 139L117 94L146 112L180 77L212 92L246 55L279 68L315 37L348 52L389 22L410 30" className={styles.chartLine}/>
			<path d="M50 150V119M45 127H55M83 148V111M78 117H88M117 119V82M112 91H122M151 124V94M146 101H156M184 105V64M179 71H189M218 105V77M213 83H223M250 83V43M245 51H255M284 81V54M279 60H289M318 54V27M313 33H323M352 67V42M347 48H357M386 39V14M381 21H391" className={styles.chartCandles}/>
		</svg>
		<p>{title}</p>
	</div>;
}

export function CourseLandingPage({enrollLabel}: {enrollLabel: string}) {
	const visibleInstructor = getVisibleInstructor();
	const visibleGallery = getVisibleGallery();
	const hasSampleContent = Boolean(data.sample.lessonUrl || data.sample.pdfUrl);

	return <main className={styles.coursePage}>
		<section className={styles.hero} id="course-hero">
			<div className={`container ${styles.heroGrid}`}>
				<div className={styles.heroCopy}>
					<p className={styles.heroEyebrow}><span/> {data.hero.eyebrow}</p>
					<h1>{data.hero.headline}</h1>
					<p className={styles.heroLead}>{data.hero.subheadline}</p>
					<ul className={styles.trustPoints}><li><Check size={16} aria-hidden="true"/>{COURSE_VIDEO_COUNT} pre-recorded video lessons</li><li><Check size={16} aria-hidden="true"/>Lifetime access — <a href="/terms">see Terms</a></li></ul>
					<section className={styles.statsSection} aria-label="Course at a glance"><div className={styles.statsGrid}>
						<Stat icon={BookOpen} value={`${moduleCount} modules`} label="Structured curriculum"/>
						<Stat icon={FileText} value={`${lessonCount} videos`} label="Pre-recorded lessons"/>
						<Stat icon={LockKeyhole} value="Verified payment" label="Required for course access"/>
					</div></section>
				</div>
				<aside className={styles.heroAside} aria-label="Course price and illustrative chart">
					<div className={styles.heroPrice}><PriceBlock enrollLabel={enrollLabel} secureText="Secure payment via Razorpay · UPI / Cards / Net Banking"/></div>
					<div className={styles.heroMedia}>
						{data.hero.videoUrl ? <iframe className={styles.videoFrame} src={data.hero.videoUrl} title={`${data.name} video preview`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/> : <>
							<ChartPreview title="Illustrative chart example"/>
							<div className={styles.previewCaption}><span className={styles.playMark}><Play size={16} fill="currentColor" aria-hidden="true"/></span><span><strong>Illustrative chart only</strong><small>No course video preview is currently available.</small></span></div>
						</>}
					</div>
				</aside>
			</div>
		</section>

		<section className={`section ${styles.section}`}><div className="container">
			<SectionTitle kicker="What you will learn" title="Topics covered in the course" description="The published curriculum covers these topics across 11 pre-recorded lessons."/>
			<div className={styles.topicGrid}>{visibleCurriculum.map(module =>
				<article key={module.title} className={styles.topicCard}><span className={styles.topicIcon}><BookOpen size={20} aria-hidden="true"/></span><h3>{module.title}</h3><p>{module.lessons.map(lesson => lesson.title).join(' · ')}</p></article>,
			)}</div>
		</div></section>

		{visibleCurriculum.length > 0 && <section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="Inside the course" title="Complete 11-video curriculum" description={`${moduleCount} modules and ${lessonCount} pre-recorded video lessons. Lesson files are available after purchase.`}/>
			<CourseCurriculum modules={visibleCurriculum}/>
		</div></section>}

		{hasSampleContent && <section className={`section ${styles.section}`}><div className={`container ${styles.sampleGrid}`}>
			<div><SectionTitle kicker="Take a first look" title="Try a free sample" description="See the teaching style and course materials before deciding whether this learning path is right for you."/></div>
			<div className={styles.sampleCard}><div className={styles.sampleIcon}><Play size={21} aria-hidden="true"/></div><div className={styles.sampleText}><h3>Sample lesson & course notes</h3><p>Preview a lesson or download a sample PDF when the links are ready.</p></div><div className={styles.sampleActions}>
				{data.sample.lessonUrl ? <a className="btn btn-primary" href={data.sample.lessonUrl} target="_blank" rel="noreferrer">Watch sample <ArrowRight size={16}/></a> : <span className={styles.linkPlaceholder}>Sample lesson link to be added</span>}
				{data.sample.pdfUrl ? <a className="btn btn-dark" href={data.sample.pdfUrl} target="_blank" rel="noreferrer">Sample PDF <FileText size={16}/></a> : <span className={styles.linkPlaceholder}>Sample PDF link to be added</span>}
			</div></div>
		</div></section>}

		{visibleInstructor && <section className={`section ${styles.sectionAlt}`}><div className={`container ${styles.instructorGrid}`}>
			<div className={styles.instructorPhoto}>{visibleInstructor.photo ? <Image src={visibleInstructor.photo} alt={`${visibleInstructor.name}, ${visibleInstructor.role}`} width={520} height={560} sizes="(max-width: 800px) 100vw, 40vw" className={styles.instructorImage}/> : <div className={styles.instructorPlaceholder}><BookOpen size={36} aria-hidden="true"/><span>Instructor profile coming soon</span></div>}</div>
			<div className={styles.instructorCopy}><p className={styles.kicker}>Learn with guidance</p><h2>Meet your instructor</h2><p className={styles.instructorRole}>{visibleInstructor.role}</p><p className={styles.instructorBio}>{visibleInstructor.bio}</p><div className={styles.experience}><BadgeCheck size={19} aria-hidden="true"/><span>{visibleInstructor.experience}</span></div></div>
		</div></section>}

		<section className={`section ${styles.section}`}><div className="container">
			<SectionTitle kicker="A good fit matters" title="Is this course right for you?" description="A clear view of who will benefit, and what this course does not promise."/>
			<div className={styles.audienceGrid}><AudienceColumn title="This course may suit you if…" items={data.audience.for} positive/><AudienceColumn title="This course is not for you if…" items={data.audience.notFor}/></div>
			<p className={styles.honestyNote}><ShieldCheck size={19} aria-hidden="true"/> This is an educational course, not a guaranteed-profit programme, a signal service or personalised investment advice.</p>
		</div></section>

		{visibleGallery.length > 0 && <section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="See the learning format" title="Inside the lessons" description="A quick look at the kind of practical chart and lesson walkthroughs inside the course."/>
			<div className={styles.galleryGrid}>{visibleGallery.map(item => <figure key={item.title} className={styles.galleryCard}>{item.image ? <Image src={item.image} alt={item.description} width={640} height={420} sizes="(max-width: 720px) 100vw, 33vw" className={styles.galleryImage}/> : <ChartPreview title={item.title}/>}<figcaption><strong>{item.title}</strong><span>{item.description}</span></figcaption></figure>)}</div>
		</div></section>}

		{data.testimonials.length > 0 && <section className={`section ${styles.section}`}><div className="container"><SectionTitle kicker="Learner feedback" title="What learners say"/><div className={styles.testimonialGrid}>{data.testimonials.map((item, index) => <figure key={`${item.name}-${index}`} className={styles.testimonial}><blockquote>“{item.quote}”</blockquote><figcaption><strong>{item.name}</strong><span>{item.detail}</span></figcaption></figure>)}</div></div></section>}

		<section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="Course format and access" title="Learn at your own pace" description="The course contains 11 pre-recorded digital video lessons. Purchase includes lifetime access to this course, subject to the Terms. Secure access links and browser sessions expire; support can help you recover access."/>
			<p><a href="/terms">Read the lifetime access terms</a> · <a href="/contact">Contact support</a></p>
		</div></section>
		<section className={`section ${styles.pricingSection}`} id="enrol"><div className={`container ${styles.pricingLayout}`}>
			<div className={styles.pricingIntro}><p className={styles.kicker}>Transparent pricing</p><h2>{formatCoursePrice(data.pricing.priceInr)} INR for the complete {COURSE_VIDEO_COUNT}-video course.</h2><p>One payment. No course renewal fee. Course access begins after payment verification. <a href="/terms">Lifetime access — see Terms</a>.</p><ul className={styles.includedList}>{data.includes.map(item => <li key={item}><Check size={17} aria-hidden="true"/>{item}</li>)}</ul><div className={styles.paymentMethods}><span><Wallet size={17} aria-hidden="true"/> UPI</span><span><CreditCard size={17} aria-hidden="true"/> Cards</span><span><LandmarkIcon/> Net Banking</span><span><Wallet size={17} aria-hidden="true"/> Wallets</span></div></div>
			<div className={styles.pricingCard}><div className={styles.pricingCardHead}><span>Full course access</span><span className={styles.securePill}><LockKeyhole size={13} aria-hidden="true"/> Secure payment</span></div><PriceBlock enrollLabel={enrollLabel} compact/><p className={styles.instantNote}><Check size={16} aria-hidden="true"/> Access follows verified payment capture</p><p className={styles.paymentProviders}>Payments processed by Razorpay for CampusEduX</p></div>
		</div></section>

		<section className={`section ${styles.section}`}><div className="container"><SectionTitle kicker="Simple to begin" title="How it works"/><div className={styles.stepsGrid}>{data.steps.map((step, index) => <article key={step.title} className={styles.stepCard}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></div></section>

		{data.bonuses.length > 0 && <section className={`section ${styles.sectionAlt}`}><div className="container"><SectionTitle kicker="Included extras" title="Course bonuses"/><div className={styles.bonusGrid}>{data.bonuses.map(bonus => <article key={bonus.title} className={styles.bonusCard}><Check size={19} aria-hidden="true"/><div><h3>{bonus.title}</h3><p>{bonus.description}</p></div></article>)}</div></div></section>}

		<section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="Clear terms" title="Refunds and course support" description="Please review the full policy before purchase. Our support team can help with course access and payment questions."/>
			<div className={styles.policyGrid}><article className={styles.policyCard}><FileText size={22} aria-hidden="true"/><h3>Refund policy</h3><p>Purchases are generally non-refundable once valid course access has been provided. Applicable consumer rights remain available. Contact support about duplicate payments, failed payments or missing access.</p><a href={data.policies.refundUrl}>Read refund policy <ArrowRight size={15}/></a></article><article className={styles.policyCard}><MessageCircle size={22} aria-hidden="true"/><h3>Talk to support</h3><p>Contact support about payment and course-access questions before purchase.</p><a href={`https://wa.me/${data.support.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp support <ArrowRight size={15}/></a></article></div>
		</div></section>

		<section className={`section ${styles.section}`}><div className="container">
			<SectionTitle kicker="Questions, answered" title="Frequently asked questions"/>
			<div className={styles.faqList}>{data.faqs.map((faq, index) => <details key={faq.question} className={styles.faqItem} open={index === 0}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{faq.answer}</p></details>)}</div>
			<div className={styles.supportGrid}><a className={styles.supportCard} href={`https://wa.me/${data.support.whatsappNumber}?text=${encodeURIComponent(`Hi, I have a question about the ${data.name}.`)}`} target="_blank" rel="noreferrer"><span className={styles.supportIcon}><MessageCircle size={21} aria-hidden="true"/></span><span><strong>WhatsApp support</strong><small>{data.support.whatsappDisplay}</small></span><ArrowRight size={17} aria-hidden="true"/></a><a className={styles.supportCard} href={`mailto:${data.support.email}?subject=${encodeURIComponent(`Question about ${data.name}`)}`}><span className={styles.supportIcon}><Mail size={21} aria-hidden="true"/></span><span><strong>Email support</strong><small>{data.support.email}</small></span><ArrowRight size={17} aria-hidden="true"/></a></div>
		</div></section>

		<section className={styles.finalCta}><div className={`container ${styles.finalCtaInner}`}><div><p className={styles.kicker}>Your next step</p><h2>Enroll in the Share Market Educational Course</h2><p>{COURSE_VIDEO_COUNT} pre-recorded video lessons · {formatCoursePrice(data.pricing.priceInr)} INR · Lifetime access — see Terms.</p></div><RazorpayCheckoutButton label={enrollLabel} className="btn btn-gold"/></div></section>

		<section className={styles.disclaimerSection}><div className={`container ${styles.disclaimer}`}><ShieldCheck size={22} aria-hidden="true"/><div><h2>Educational risk disclaimer</h2><p>This course is intended solely for educational purposes. It does not constitute personalized investment advice, stock recommendations, or guaranteed trading returns. Trading and investing involve financial risk, including possible loss of capital.</p><nav aria-label="Legal links"><a href={data.policies.privacyUrl}>Privacy Policy</a><a href={data.policies.termsUrl}>Terms &amp; Conditions</a><a href={data.policies.refundUrl}>Refund &amp; Cancellation Policy</a><a href={data.policies.contactUrl}>Contact Us</a><a href="/risk-disclaimer">Risk Disclaimer</a><a href={`https://wa.me/${data.support.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`mailto:${data.support.email}`}>Email</a></nav></div></div></section>
		<StickyCourseCTA label={enrollLabel}/>
	</main>;
}

function Stat({icon: Icon, value, label}: {icon: typeof BookOpen; value: string; label: string}) {
	return <div className={styles.stat}><Icon size={19} aria-hidden="true"/><strong>{value}</strong><span>{label}</span></div>;
}

function AudienceColumn({title, items, positive = false}: {title: string; items: string[]; positive?: boolean}) {
	return <article className={`${styles.audienceCard} ${positive ? styles.audiencePositive : ''}`}><h3>{positive ? <Check size={19} aria-hidden="true"/> : <span className={styles.crossMark}>×</span>}{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></article>;
}

function LandmarkIcon() {
	return <span className={styles.landmarkIcon} aria-hidden="true">₹</span>;
}
