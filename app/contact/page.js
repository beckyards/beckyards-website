import Header from '../components/Header';
import Footer from '../components/Footer';
import Contact from '../components/Contact';
import { getContent } from '../../lib/siteContent';
import { CONTACT_PAGE_DEFAULT } from '../../lib/pageContent';

export const revalidate = 60;

export const metadata = {
  title: 'Contact — BeckYards',
  description: 'Request a landscaping quote from BeckYards Landscaping & Design.',
};

export default async function ContactPage() {
  const c = await getContent('contact', CONTACT_PAGE_DEFAULT);

  return (
    <>
      <Header />
      <main>
        <Contact c={c} />
      </main>
      <Footer />
    </>
  );
}
