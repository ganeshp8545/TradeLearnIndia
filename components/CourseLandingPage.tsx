import Image from 'next/image';
import {
	Activity, ArrowRight, BadgeCheck, Brain, BookOpen, Check, ChevronDown,
	Clock3, CreditCard, FileText, Infinity as InfinityIcon, Languages, Laptop, Layers,
	LockKeyhole, Mail, MessageCircle, MonitorPlay, Play, ShieldCheck,
	Target, TrendingUp, Wallet,
} from 'lucide-react';
import {RazorpayCheckoutButton} from '@/components/RazorpayCheckoutButton';
import {CourseCurriculum} from '@/components/CourseCurriculum';
import {coursePageData as data, formatCoursePrice, getVisibleCurriculum, getVisibleGallery, getVisibleInstructor} from '@/lib/course-page-data';
import {OfferCountdown, StickyCourseCTA} from '@/components/CourseInteractions';
import styles from './CourseLandingPage.module.css';

const topicIcons = {book: BookOpen, chart: TrendingUp, activity: Activity, layers: Layers, target: Target, trending: TrendingUp, shield: ShieldCheck, brain: Brain, search: MonitorPlay};
const visibleCurriculum = getVisibleCurriculum();
const moduleCount = visibleCurriculum.length;
const lessonCount = visibleCurriculum.reduce((count, module) => count + module.lessons.length, 0);

function SectionTitle({kicker, title, description}: {kicker: string; title: string; description?: string}) {
	return <div className={styles.sectionTitle}><p className={styles.kicker}>{kicker}</p><h2>{title}</h2>{description && <p className={styles.sectionDescription}>{description}</p>}</div>;
}

function PriceBlock({enrollLabel, compact = false, secureText = 'Secure checkout with Razorpay'}: {enrollLabel: string; compact?: boolean; secureText?: string}) {
	return <div className={`${styles.priceBlock} ${compact ? styles.priceBlockCompact : ''}`}>
		<p className={styles.originalPrice}>Regular price <s>{formatCoursePrice(data.pricing.originalPriceInr)}</s></p>
		<p className={styles.currentPrice}>{formatCoursePrice(data.pricing.priceInr)}</p>
		{data.pricing.offerEndDate && <OfferCountdown endDate={data.pricing.offerEndDate}/>}
		<div id={compact ? undefined : 'course-hero-enroll'}><RazorpayCheckoutButton label={enrollLabel} className="btn btn-gold w-full"/></div>
		<p className={styles.secureNote}><LockKeyhole size={14} aria-hidden="true"/>{secureText}</p>
	</div>;
}

function ChartPreview({title}: {title: string}) {
	return <div className={styles.chartPreview} role="img" aria-label={`${title}, illustrative chart preview`}>
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
					<ul className={styles.trustPoints}>{data.hero.trustPoints.map(point => <li key={point}><Check size={16} aria-hidden="true"/>{point}</li>)}</ul>
					<section className={styles.statsSection} aria-label="Course at a glance"><div className={styles.statsGrid}>
						<Stat icon={Clock3} value={data.stats.videoHours} label="Video lessons"/>
						<Stat icon={BookOpen} value={`${moduleCount} modules`} label="Structured curriculum"/>
						<Stat icon={FileText} value={`${lessonCount} lessons`} label="Self-paced learning"/>
						<Stat icon={Languages} value={data.stats.language} label="Course language"/>
						<Stat icon={InfinityIcon} value={data.stats.access} label="Never expires"/>
						<Stat icon={Laptop} value={data.stats.devices} label="Supported devices"/>
					</div></section>
				</div>
				<aside className={styles.heroAside} aria-label="Course price and preview">
					<div className={styles.heroPrice}><PriceBlock enrollLabel={enrollLabel} secureText="Secure payment via Razorpay · UPI / Cards / Net Banking · Instant access"/></div>
					<div className={styles.heroMedia}>
						{data.hero.videoUrl ? <iframe className={styles.videoFrame} src={data.hero.videoUrl} title={`${data.name} video preview`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/> : <>
							<ChartPreview title="Practical chart-based learning"/>
							<div className={styles.previewCaption}><span className={styles.playMark}><Play size={16} fill="currentColor" aria-hidden="true"/></span><span><strong>Course preview</strong><small>Video preview coming soon</small></span></div>
						</>}
					</div>
				</aside>
			</div>
		</section>

		<section className={`section ${styles.section}`}><div className="container">
			<SectionTitle kicker="A practical foundation" title="What you will learn" description="Build a clearer understanding of the market, charts and trading decisions with focused lessons across these topics."/>
			<div className={styles.topicGrid}>{data.topics.map(topic => {
				const Icon = topicIcons[topic.icon as keyof typeof topicIcons] ?? BookOpen;
				return <article key={topic.title} className={styles.topicCard}><span className={styles.topicIcon}><Icon size={20} aria-hidden="true"/></span><h3>{topic.title}</h3><p>{topic.description}</p></article>;
			})}</div>
		</div></section>

		{visibleCurriculum.length > 0 && <section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="Inside the course" title="Course curriculum" description="Explore the learning path. Lessons marked as free preview are available to sample before enrolling."/>
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

		<section className={`section ${styles.pricingSection}`} id="enrol"><div className={`container ${styles.pricingLayout}`}>
			<div className={styles.pricingIntro}><p className={styles.kicker}>Learn at your own pace</p><h2>One course. A clearer learning path.</h2><p>Get lifetime access to a structured set of market lessons and practical chart explanations.</p><ul className={styles.includedList}>{data.includes.map(item => <li key={item}><Check size={17} aria-hidden="true"/>{item}</li>)}</ul><div className={styles.paymentMethods}><span><Wallet size={17} aria-hidden="true"/> UPI</span><span><CreditCard size={17} aria-hidden="true"/> Cards</span><span><LandmarkIcon/> Net Banking</span><span><Wallet size={17} aria-hidden="true"/> Wallets</span></div></div>
			<div className={styles.pricingCard}><div className={styles.pricingCardHead}><span>Full course access</span><span className={styles.securePill}><LockKeyhole size={13} aria-hidden="true"/> Secure payment</span></div><PriceBlock enrollLabel={enrollLabel} compact/><p className={styles.instantNote}><Check size={16} aria-hidden="true"/> Instant access steps after successful payment</p><p className={styles.paymentProviders}>Payments processed securely by Razorpay</p></div>
		</div></section>

		<section className={`section ${styles.section}`}><div className="container"><SectionTitle kicker="Simple to begin" title="How it works"/><div className={styles.stepsGrid}>{data.steps.map((step, index) => <article key={step.title} className={styles.stepCard}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div></div></section>

		{data.bonuses.length > 0 && <section className={`section ${styles.sectionAlt}`}><div className="container"><SectionTitle kicker="Included extras" title="Course bonuses"/><div className={styles.bonusGrid}>{data.bonuses.map(bonus => <article key={bonus.title} className={styles.bonusCard}><Check size={19} aria-hidden="true"/><div><h3>{bonus.title}</h3><p>{bonus.description}</p></div></article>)}</div></div></section>}

		<section className={`section ${styles.sectionAlt}`}><div className="container">
			<SectionTitle kicker="Clear terms" title="Refunds and course support" description="Please review the full policy before purchase. Our support team can help with course access and payment questions."/>
			<div className={styles.policyGrid}><article className={styles.policyCard}><FileText size={22} aria-hidden="true"/><h3>Refund policy</h3><p>Refund eligibility and conditions are explained in the full policy.</p><a href={data.policies.refundUrl}>Read refund policy <ArrowRight size={15}/></a></article><article className={styles.policyCard}><MessageCircle size={22} aria-hidden="true"/><h3>Talk to support</h3><p>Available {data.support.hours} for payment and course-access help.</p><a href={`https://wa.me/${data.support.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp support <ArrowRight size={15}/></a></article></div>
		</div></section>

		<section className={`section ${styles.section}`}><div className="container">
			<SectionTitle kicker="Questions, answered" title="Frequently asked questions"/>
			<div className={styles.faqList}>{data.faqs.map((faq, index) => <details key={faq.question} className={styles.faqItem} open={index === 0}><summary>{faq.question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{faq.answer}</p></details>)}</div>
			<div className={styles.supportGrid}><a className={styles.supportCard} href={`https://wa.me/${data.support.whatsappNumber}?text=${encodeURIComponent(`Hi, I have a question about the ${data.name}.`)}`} target="_blank" rel="noreferrer"><span className={styles.supportIcon}><MessageCircle size={21} aria-hidden="true"/></span><span><strong>WhatsApp support</strong><small>{data.support.whatsappDisplay} · {data.support.hours}</small></span><ArrowRight size={17} aria-hidden="true"/></a><a className={styles.supportCard} href={`mailto:${data.support.email}?subject=${encodeURIComponent(`Question about ${data.name}`)}`}><span className={styles.supportIcon}><Mail size={21} aria-hidden="true"/></span><span><strong>Email support</strong><small>{data.support.email} · {data.support.hours}</small></span><ArrowRight size={17} aria-hidden="true"/></a></div>
		</div></section>

		<section className={styles.finalCta}><div className={`container ${styles.finalCtaInner}`}><div><p className={styles.kicker}>Your next step</p><h2>Build your market knowledge, one lesson at a time.</h2><p>Start the Share Market Complete Course with lifetime access.</p></div><RazorpayCheckoutButton label={enrollLabel} className="btn btn-gold"/></div></section>

		<section className={styles.disclaimerSection}><div className={`container ${styles.disclaimer}`}><ShieldCheck size={22} aria-hidden="true"/><div><h2>Important risk disclaimer</h2><p>Course content is for educational purposes only and is not investment advice. Trading and investing involve risk, including possible loss of capital. No profit or return is guaranteed. TradeLearnIndia and CampusEduX are not SEBI-registered investment advisers. Please do your own research and consider your risk tolerance before making financial decisions.</p><nav aria-label="Legal links"><a href={data.policies.privacyUrl}>Privacy Policy</a><a href={data.policies.termsUrl}>Terms</a><a href={data.policies.refundUrl}>Refund Policy</a><a href={data.policies.contactUrl}>Contact</a><a href={`https://wa.me/${data.support.whatsappNumber}`} target="_blank" rel="noreferrer">WhatsApp</a><a href={`mailto:${data.support.email}`}>Email</a></nav></div></div></section>
		<StickyCourseCTA label={enrollLabel} originalPrice={formatCoursePrice(data.pricing.originalPriceInr)}/>
	</main>;
}

function Stat({icon: Icon, value, label}: {icon: typeof Clock3; value: string; label: string}) {
	return <div className={styles.stat}><Icon size={19} aria-hidden="true"/><strong>{value}</strong><span>{label}</span></div>;
}

function AudienceColumn({title, items, positive = false}: {title: string; items: string[]; positive?: boolean}) {
	return <article className={`${styles.audienceCard} ${positive ? styles.audiencePositive : ''}`}><h3>{positive ? <Check size={19} aria-hidden="true"/> : <span className={styles.crossMark}>×</span>}{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></article>;
}

function LandmarkIcon() {
	return <span className={styles.landmarkIcon} aria-hidden="true">₹</span>;
}