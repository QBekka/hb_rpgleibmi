/*import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';*/

import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import clsx from 'clsx';
import styles from './index.module.css';

/*function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/category/1-start">
            Start tutorial
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
*/

// Correcte manier om een afbeelding te importeren
import Logo from '@site/static/img/logo.svg';

export default function Home() {
  return (
    <Layout title="Handboek RPGLE & IBM i" description="Van het verbinden met de server tot aan het ontwikkelen van geavanceerde applicaties.">
      <header className={clsx('hero', styles.heroBanner)}>
        <div className={styles.container}>
          {/* Linkerkant: Titel, ondertitel, button */}
          <div className={styles.textContainer}>
            <h1 className="hero__title">Handboek RPGLE & IBM i</h1>
            <p className="hero__subtitle">Van het verbinden met de server tot aan het ontwikkelen van geavanceerde applicaties.</p>
            <Link id='knopje' className="button button--primary button--lg" to="/docs/category/1-start">
              Start hier
            </Link>
          </div>
          {/* Rechterkant: GIF-afbeelding */}
          <div className={styles.imageContainer}>
            <img src="/img/load.gif" alt="Laden..." className={styles.gif} />
          </div>
        </div>
      </header>
    </Layout>
  );
}