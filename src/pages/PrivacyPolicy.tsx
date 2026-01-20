import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-16 px-6">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy – Birth Rebel Ltd</h1>
          
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Who we are and our contact details</h2>
            <p className="text-muted-foreground mb-4">
              We are Birth Rebel Ltd, a company registered in England and Wales (company number 16449005), with our registered office at 84 Salehurst Road, London, SE4 1AW, United Kingdom.
            </p>
            <p className="text-muted-foreground mb-4">
              We operate a maternity care marketplace that connects parents with independent, non-medical maternity and postnatal caregivers. We facilitate matching, communication, session booking, and payments through our platform.
            </p>
            <p className="text-muted-foreground mb-4">
              If you have any questions about this policy or how we use your data, you can contact us at{" "}
              <a href="mailto:hello@birthrebel.com" className="text-primary hover:underline">hello@birthrebel.com</a>.
            </p>
            <p className="text-muted-foreground">
              Birth Rebel Ltd is the data controller for the purposes of UK data protection law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Compliance</h2>
            <p className="text-muted-foreground mb-4">
              We process personal data in accordance with all applicable UK data protection and privacy legislation, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>The UK General Data Protection Regulation (UK GDPR)</li>
              <li>The Data Protection Act 2018</li>
              <li>The Privacy and Electronic Communications Regulations 2003 (as amended)</li>
            </ul>
            <p className="text-muted-foreground">
              We only process personal data where it is necessary, proportionate, and for the purposes set out in this policy. We use appropriate technical and organisational measures to protect your personal data against unauthorised or unlawful processing, accidental loss, destruction, or damage.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">What information we collect, use, and why</h2>
            <p className="text-muted-foreground mb-4">We collect and use personal information to:</p>
            <ol className="list-decimal pl-6 text-muted-foreground mb-4 space-y-1">
              <li>provide our services</li>
              <li>operate and manage your account</li>
              <li>send service-related updates or marketing communications (where permitted)</li>
              <li>respond to queries, complaints, or claims</li>
            </ol>
            <p className="text-muted-foreground mb-4">This may include:</p>
            
            <h3 className="text-lg font-medium text-foreground mb-2">Parents and users</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>Full name</li>
              <li>Email address</li>
              <li>Date of birth</li>
              <li>Gender (optional)</li>
              <li>Information you choose to share about pregnancy, birth, or postnatal topics</li>
              <li>Location data (general area only)</li>
              <li>IP address and device information</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2">Caregivers</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>Title</li>
              <li>Qualifications and training</li>
              <li>Professional profile information</li>
              <li>Availability and service details</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground mb-2">Payments</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>Banking and payment details (processed securely by Stripe – we do not store full card details)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Special category data</h2>
            <p className="text-muted-foreground mb-4">
              Some of the information you choose to share with us may be classed as special category data, such as information relating to pregnancy, postnatal recovery, or other sensitive health-related topics.
            </p>
            <p className="text-muted-foreground mb-4">
              We only collect this information where it is necessary to provide our matching and communication services. We rely on your explicit consent under Article 9(2)(a) of the UK GDPR.
            </p>
            <p className="text-muted-foreground">
              You can withdraw your consent at any time by contacting us at{" "}
              <a href="mailto:hello@birthrebel.com" className="text-primary hover:underline">hello@birthrebel.com</a>.
            </p>
          </section>

          <section className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Important note about medical care</h2>
            <p className="text-muted-foreground">
              Birth Rebel does not provide medical advice, diagnosis, or treatment. We are not an emergency service and we do not replace NHS or private medical care.
            </p>
            <p className="text-muted-foreground mt-2">
              If you need urgent medical assistance, you should contact your GP, NHS 111, or emergency services immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Lawful bases and your data protection rights</h2>
            <p className="text-muted-foreground mb-4">
              Under UK data protection law, we must have a lawful basis for using your personal information. The lawful basis we rely on may affect which rights apply in each situation. In some cases, all of your rights will apply, and in others, certain rights may be limited or not relevant.
            </p>
            <p className="text-muted-foreground mb-4">Your rights include:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li><strong>Right of access</strong> – request a copy of your data</li>
              <li><strong>Right to rectification</strong> – correct inaccurate or incomplete data</li>
              <li><strong>Right to erasure</strong> – request deletion in certain circumstances</li>
              <li><strong>Right to restriction</strong> – limit how we use your data</li>
              <li><strong>Right to object</strong> – object to certain uses of your data</li>
              <li><strong>Right to data portability</strong> – receive or transfer your data</li>
              <li><strong>Right to withdraw consent</strong> – where we rely on consent</li>
            </ul>
            <p className="text-muted-foreground mb-4">We will respond to valid requests within one month.</p>
            <p className="text-muted-foreground">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:hello@birthrebel.com" className="text-primary hover:underline">hello@birthrebel.com</a>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Our lawful bases for using your data</h2>
            <p className="text-muted-foreground mb-4">We rely on the following lawful bases:</p>
            
            <h3 className="text-lg font-medium text-foreground mb-2">Contract</h3>
            <p className="text-muted-foreground mb-4">
              We use your data to enter into and perform our contract with you, including providing services, managing bookings, and processing payments.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Legal obligation</h3>
            <p className="text-muted-foreground mb-4">
              We may use your data to comply with legal and regulatory requirements.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Consent</h3>
            <p className="text-muted-foreground mb-4">
              Where required (for example, for marketing or special category data), we rely on your consent. You may withdraw this at any time.
            </p>

            <h3 className="text-lg font-medium text-foreground mb-2">Legitimate interests</h3>
            <p className="text-muted-foreground">
              We may use your data where necessary for our legitimate interests, provided these do not override your rights. For example, to improve our platform, prevent fraud, and send important service-related updates. You have the right to object to this processing.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Where we get your information from</h2>
            <p className="text-muted-foreground mb-4">We collect personal data:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Directly from you</li>
              <li>From your use of our platform</li>
              <li>From publicly available sources (e.g., professional listings for caregivers)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">How long we keep your information</h2>
            <p className="text-muted-foreground mb-4">We retain personal data only for as long as necessary to:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>Provide our services</li>
              <li>Meet legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p className="text-muted-foreground mb-4">Typically:</p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>Account and transaction records: 6 years after account closure</li>
              <li>Communications and usage records: up to 2 years after last interaction</li>
            </ul>
            <p className="text-muted-foreground">
              If we no longer need your data, we will delete or anonymise it.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Data storage, transfers and security</h2>
            <p className="text-muted-foreground mb-4">
              Your data is stored on secure servers within the UK and EEA.
            </p>
            <p className="text-muted-foreground mb-4">
              Where personal data is transferred outside the UK or EEA, we ensure appropriate safeguards are in place, such as Standard Contractual Clauses or equivalent protections.
            </p>
            <p className="text-muted-foreground">
              We use encryption, access controls, and secure authentication methods to protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Who we share your information with</h2>
            
            <h3 className="text-lg font-medium text-foreground mb-2">Our service providers (data processors)</h3>
            <p className="text-muted-foreground mb-4">
              We use trusted third-party providers to help us operate our platform, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-1">
              <li>GetStream – video services</li>
              <li>Supabase – database and authentication</li>
              <li>Cloudflare – web security and hosting</li>
              <li>Resend – transactional email</li>
              <li>PostHog – analytics</li>
              <li>Stripe – payments</li>
              <li>Loops – marketing emails</li>
              <li>Signable – e-signatures</li>
              <li>Google Workspace – internal communications</li>
            </ul>
            <p className="text-muted-foreground mb-4">Each provider is bound by a Data Processing Agreement.</p>

            <h3 className="text-lg font-medium text-foreground mb-2">Marketplace sharing</h3>
            <p className="text-muted-foreground mb-4">
              If you are a parent, we will share relevant information with the caregiver you choose or approve, to enable delivery of services.
            </p>
            <p className="text-muted-foreground">
              If you are a caregiver, we will share relevant information with parents who have chosen or been matched with you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Cookies and analytics</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar technologies to operate our platform, understand usage, and improve our services. Some cookies are essential, while others (such as analytics) require your consent.
            </p>
            <p className="text-muted-foreground">
              For more information, please see our Cookie Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Children's data</h2>
            <p className="text-muted-foreground">
              Our services are intended for individuals aged 18 and over. We do not knowingly collect personal data from children. If we become aware that we have done so, we will delete it promptly.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Automated decision-making</h2>
            <p className="text-muted-foreground">
              We do not use automated decision-making or profiling that has legal or similarly significant effects. If this changes, we will update this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">How to complain</h2>
            <p className="text-muted-foreground mb-4">
              If you have concerns about how we use your data, contact us at{" "}
              <a href="mailto:hello@birthrebel.com" className="text-primary hover:underline">hello@birthrebel.com</a>.
            </p>
            <p className="text-muted-foreground mb-4">
              You also have the right to complain to the ICO:
            </p>
            <address className="text-muted-foreground not-italic">
              Information Commissioner's Office<br />
              Wycliffe House<br />
              Water Lane<br />
              Wilmslow<br />
              Cheshire<br />
              SK9 5AF<br />
              Tel: 0303 123 1113<br />
              <a href="https://www.ico.org.uk/make-a-complaint" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.ico.org.uk/make-a-complaint
              </a>
            </address>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
