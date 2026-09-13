import Header from '../components/Header';
import Footer from '../components/Footer';
import AerationSignupForm from '../components/AerationSignupForm';

export const revalidate = 60;

export const metadata = {
  title: 'Aeration & Overseeding Signup — BeckYards',
  description: 'Sign up for lawn aeration and overseeding with BeckYards Landscaping & Design.',
};

export default function AerationSignupPage() {
  return (
    <>
      <Header />
      <main>
        <AerationSignupForm />
      </main>
      <Footer />
    </>
  );
}
