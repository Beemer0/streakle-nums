import { useSeo, PAGE_SEO } from './seo'

const h2Style = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 20, fontWeight: 800, letterSpacing: 1,
  color: '#C9A84C', marginTop: 40, marginBottom: 12,
}
const h3Style = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
  color: '#C9A84C', textTransform: 'uppercase',
  marginTop: 24, marginBottom: 6,
}

export default function Privacy() {
  useSeo(PAGE_SEO.privacy)
  return (
    <main style={{
      maxWidth: 680, margin: '0 auto', padding: '48px 24px 64px',
      fontFamily: "'DM Sans', sans-serif",
      color: '#A89880', minHeight: '100vh', lineHeight: 1.8,
      fontSize: 14,
    }}>
      <a href="/" style={{color:'#C9A84C', fontSize:13, fontWeight:600, textDecoration:'none', letterSpacing:0.3}}>
        ← Back to home
      </a>

      <h1 style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 36, fontWeight: 800, letterSpacing: 3,
        color: '#F5F0E8', marginTop: 28, marginBottom: 4, lineHeight: 1.1,
      }}>
        PRIVACY POLICY
      </h1>
      <p style={{color:'#5A5040', fontSize:12, marginBottom:40, letterSpacing:0.3}}>
        Last updated / Dernière mise à jour : May 16, 2026
      </p>

      {/* ENGLISH */}
      <h2 style={h2Style}>🇨🇦 English</h2>

      <p>Welcome to <b>Nums by Streakle</b> ("we", "us", or "our"), operated at playstreakle.com. This Privacy Policy explains how we collect, use, and protect your information when you use our website and games.</p>

      <h3 style={h3Style}>1. Information We Collect</h3>
      <p><b>a) Information You Provide</b><br/>When you create an account or subscribe, we may collect your name, email address, payment information (processed securely by Stripe — we never store your card details directly), and username or display name.</p>
      <p><b>b) Automatically Collected Information</b><br/>When you visit our site, we may automatically collect browser type and version, device type and operating system, pages visited and time spent, IP address (anonymized where possible), and cookies and similar tracking technologies.</p>
      <p><b>c) Game Data</b><br/>When you play our games, we may collect puzzle results and scores, streak data and solve history, number of swaps used, and date and time of play.</p>

      <h3 style={h3Style}>2. How We Use Your Information</h3>
      <p>We use your information to provide and improve our games and services, manage your account and subscription, track your streak and game history, send you optional daily reminders (only if you opt in), process payments securely, serve relevant advertisements via Google AdSense, and comply with legal obligations.</p>

      <h3 style={h3Style}>3. Google AdSense & Cookies</h3>
      <p>We use <b>Google AdSense</b> to display advertisements on our site. Google may use cookies to serve ads based on your prior visits to our site or other sites on the internet. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" style={{color:'#C9A84C'}}>Google's Ads Settings</a>.</p>
      <p>We also use cookies to keep you logged in, remember your game preferences, and analyze site traffic. You can control cookies through your browser settings at any time.</p>

      <h3 style={h3Style}>4. Payments & Subscriptions</h3>
      <p>Payments are processed securely by <b>Stripe</b>. We do not store your credit card number, CVV, or full payment details on our servers. Stripe's privacy policy is available at <a href="https://stripe.com/privacy" style={{color:'#C9A84C'}}>stripe.com/privacy</a>.</p>

      <h3 style={h3Style}>5. Sharing Your Information</h3>
      <p>We do not sell your personal information. We may share your data with Google (for advertising and analytics), Stripe (for payment processing), service providers who help us operate our site (e.g. Vercel), and legal authorities if required by law.</p>

      <h3 style={h3Style}>6. Data Retention</h3>
      <p>We retain your data for as long as your account is active or as needed to provide our services. You may request deletion of your account and data at any time by contacting us.</p>

      <h3 style={h3Style}>7. Children's Privacy</h3>
      <p>Our games are intended for users aged <b>13 and older</b>. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>

      <h3 style={h3Style}>8. Your Rights</h3>
      <p>Depending on your location, you may have the right to access, correct, or delete your personal data, opt out of marketing communications, and withdraw consent at any time. To exercise these rights, contact us at the email below.</p>

      <h3 style={h3Style}>9. Quebec Privacy Law (Law 25)</h3>
      <p>If you are a resident of Quebec, you have additional rights under Quebec's <i>Loi sur la protection des renseignements personnels dans le secteur privé</i> (Law 25), including the right to access, correct, and request deletion of your personal information. To exercise these rights, please contact us directly.</p>

      <h3 style={h3Style}>10. Security</h3>
      <p>We take reasonable technical and organizational measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>

      <h3 style={h3Style}>11. Changes to This Policy</h3>
      <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the "Last updated" date at the top of this page.</p>

      <h3 style={h3Style}>12. Contact Us</h3>
      <p>Email: <a href="mailto:lucaboemio@gmail.com" style={{color:'#C9A84C'}}>lucaboemio@gmail.com</a><br/>Website: playstreakle.com</p>

      {/* DIVIDER */}
      <hr style={{border:'1px solid #2C2820', margin:'48px 0'}}/>

      {/* FRENCH */}
      <h2 style={h2Style}>🇫🇷 Français</h2>

      <p>Bienvenue sur <b>Nums by Streakle</b> (« nous »), accessible à playstreakle.com. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre site et nos jeux.</p>

      <h3 style={h3Style}>1. Informations que nous collectons</h3>
      <p><b>a) Informations que vous nous fournissez</b><br/>Lors de la création d'un compte ou d'un abonnement, nous pouvons collecter votre nom, votre adresse courriel, vos informations de paiement (traitées de manière sécurisée par Stripe — nous ne stockons jamais directement vos coordonnées bancaires), ainsi que votre nom d'utilisateur ou pseudonyme.</p>
      <p><b>b) Informations collectées automatiquement</b><br/>Lors de votre visite, nous pouvons collecter le type et la version de votre navigateur, le type d'appareil et le système d'exploitation, les pages visitées et le temps passé, l'adresse IP (anonymisée dans la mesure du possible), ainsi que les témoins de connexion (cookies).</p>
      <p><b>c) Données de jeu</b><br/>Lorsque vous jouez à nos jeux, nous pouvons collecter les résultats et scores des casse-têtes, les données de série et l'historique des parties, le nombre d'échanges effectués, ainsi que la date et l'heure de jeu.</p>

      <h3 style={h3Style}>2. Utilisation de vos informations</h3>
      <p>Nous utilisons vos informations pour fournir et améliorer nos jeux et services, gérer votre compte et votre abonnement, suivre votre série et votre historique de jeu, vous envoyer des rappels quotidiens optionnels (uniquement si vous y consentez), traiter les paiements de manière sécurisée, afficher des publicités pertinentes via Google AdSense, et respecter nos obligations légales.</p>

      <h3 style={h3Style}>3. Google AdSense et témoins de connexion</h3>
      <p>Nous utilisons <b>Google AdSense</b> pour afficher des publicités. Google peut utiliser des cookies pour diffuser des annonces basées sur vos visites antérieures. Vous pouvez désactiver la publicité personnalisée en visitant les <a href="https://www.google.com/settings/ads" style={{color:'#C9A84C'}}>Paramètres des annonces Google</a>.</p>
      <p>Nous utilisons également des cookies pour maintenir votre session, mémoriser vos préférences et analyser le trafic. Vous pouvez les contrôler via les paramètres de votre navigateur.</p>

      <h3 style={h3Style}>4. Paiements et abonnements</h3>
      <p>Les paiements sont traités par <b>Stripe</b>. Nous ne stockons pas vos coordonnées bancaires complètes. La politique de Stripe est disponible à <a href="https://stripe.com/privacy" style={{color:'#C9A84C'}}>stripe.com/privacy</a>.</p>

      <h3 style={h3Style}>5. Partage de vos informations</h3>
      <p>Nous ne vendons pas vos informations personnelles. Nous pouvons les partager avec Google (publicité et analyse), Stripe (paiements), des fournisseurs de services (ex. Vercel), et des autorités légales si la loi l'exige.</p>

      <h3 style={h3Style}>6. Conservation des données</h3>
      <p>Nous conservons vos données aussi longtemps que votre compte est actif. Vous pouvez demander la suppression de vos données à tout moment en nous contactant.</p>

      <h3 style={h3Style}>7. Protection des mineurs</h3>
      <p>Nos jeux sont destinés aux utilisateurs âgés de <b>13 ans et plus</b>. Nous ne collectons pas sciemment d'informations personnelles auprès d'enfants de moins de 13 ans.</p>

      <h3 style={h3Style}>8. Vos droits</h3>
      <p>Vous pouvez avoir le droit d'accéder à vos données, de les corriger ou de les supprimer, de vous désinscrire des communications marketing, et de retirer votre consentement à tout moment.</p>

      <h3 style={h3Style}>9. Loi 25 du Québec</h3>
      <p>Si vous résidez au Québec, vous bénéficiez de droits supplémentaires en vertu de la <i>Loi sur la protection des renseignements personnels dans le secteur privé</i> (Loi 25), notamment le droit d'accéder à vos renseignements personnels, de les faire corriger et d'en demander la suppression.</p>

      <h3 style={h3Style}>10. Sécurité</h3>
      <p>Nous prenons des mesures raisonnables pour protéger vos données. Toutefois, aucune transmission sur Internet n'est sécurisée à 100 %.</p>

      <h3 style={h3Style}>11. Modifications</h3>
      <p>Nous pouvons mettre à jour cette politique de temps à autre. Nous vous informerons des modifications importantes en mettant à jour la date en haut de cette page.</p>

      <h3 style={h3Style}>12. Nous contacter</h3>
      <p>Courriel : <a href="mailto:lucaboemio@gmail.com" style={{color:'#C9A84C'}}>lucaboemio@gmail.com</a><br/>Site web : playstreakle.com</p>

      <div style={{marginTop:48, paddingTop:24, borderTop:'1px solid #2C2820', color:'#7A6E5F', fontSize:13}}>
        © 2026 Streakle. All rights reserved / Tous droits réservés.
      </div>
    </main>
  );
}