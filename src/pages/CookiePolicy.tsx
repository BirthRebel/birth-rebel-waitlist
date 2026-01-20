import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto prose prose-gray">
          <h1 className="text-3xl font-bold text-foreground mb-8">Cookie Policy – Birth Rebel Ltd</h1>
          
          <p className="text-muted-foreground mb-6"><strong>Effective date:</strong> 20 January 2026</p>

          <p>This Cookie Policy explains how Birth Rebel Ltd ("Birth Rebel", "we", "us", "our") uses cookies and similar technologies when you visit our website or use our platform (the "Platform").</p>
          <p>This policy should be read alongside our <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">What are cookies?</h2>
          <p>Cookies are small text files that are placed on your device (computer, phone, tablet) when you visit a website. They help websites function properly, remember your preferences, and understand how visitors use the site.</p>
          <p><strong>Cookies can be:</strong></p>
          <ul>
            <li><strong>Session cookies</strong> – deleted when you close your browser</li>
            <li><strong>Persistent cookies</strong> – stored on your device for a set period</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Why we use cookies</h2>
          <p>We use cookies to:</p>
          <ul>
            <li>Make our website work properly</li>
            <li>Keep you logged in</li>
            <li>Remember your preferences</li>
            <li>Improve performance and user experience</li>
            <li>Understand how people use our Platform</li>
            <li>Keep our Platform secure</li>
            <li>Measure and improve our services</li>
          </ul>
          <p>We do not use cookies to make medical or automated decisions about you.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Types of cookies we use</h2>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">1. Strictly necessary cookies</h3>
          <p>These cookies are essential for the website to function. They enable core features such as:</p>
          <ul>
            <li>Account login</li>
            <li>Security</li>
            <li>Navigation</li>
            <li>Payment processing</li>
            <li>Form submission</li>
          </ul>
          <p>You cannot disable these cookies, as the site would not work properly without them.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">2. Functional cookies</h3>
          <p>These cookies allow us to remember your choices and preferences, such as:</p>
          <ul>
            <li>Language</li>
            <li>Region</li>
            <li>Saved settings</li>
          </ul>
          <p>They help provide a more personalised experience.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">3. Analytics and performance cookies</h3>
          <p>These cookies help us understand how visitors use our website so we can improve it.</p>
          <p>For example, they help us see:</p>
          <ul>
            <li>Which pages are visited most</li>
            <li>How long people stay on pages</li>
            <li>Where users encounter errors</li>
          </ul>
          <p>We currently use:</p>
          <ul>
            <li><strong>PostHog</strong> – analytics and product usage tracking<br />
              <a href="https://posthog.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://posthog.com/privacy</a>
            </li>
          </ul>
          <p>We only use analytics cookies with your consent.</p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">4. Security and infrastructure cookies</h3>
          <p>We use services like:</p>
          <ul>
            <li><strong>Cloudflare</strong> – performance and security<br />
              <a href="https://www.cloudflare.com/en-gb/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://www.cloudflare.com/en-gb/privacypolicy/</a>
            </li>
          </ul>
          <p>These cookies help protect the Platform from malicious traffic and keep it stable and secure.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">How you control cookies</h2>
          <p>When you first visit our website, you will be shown a cookie banner that allows you to:</p>
          <ul>
            <li>Accept all cookies</li>
            <li>Reject non-essential cookies</li>
            <li>Manage your preferences</li>
          </ul>
          <p>You can also control cookies through your browser settings.</p>
          <p><strong>Here are links to instructions for common browsers:</strong></p>
          <ul>
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Chrome</a></li>
            <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Safari</a></li>
            <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Firefox</a></li>
            <li><a href="https://support.microsoft.com/en-us/help/4027947" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Edge</a></li>
          </ul>
          <p><strong>Please note:</strong> disabling some cookies may affect how the Platform functions.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Changes to this Cookie Policy</h2>
          <p>We may update this Cookie Policy from time to time to reflect changes in technology, law, or our services. If we make material changes, we will notify users.</p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">Contact us</h2>
          <p>If you have any questions about our use of cookies, please contact us:</p>
          <p>
            Birth Rebel Ltd<br />
            <a href="mailto:hello@birthrebel.com" className="text-primary hover:underline">hello@birthrebel.com</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
