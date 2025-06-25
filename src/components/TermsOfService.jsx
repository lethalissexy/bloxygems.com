import React from 'react';

const styles = {
  container: {
    maxWidth: '850px',
    margin: '120px auto 40px',
    padding: '2rem',
    color: '#B8C3E6',
    fontFamily: "'Inter', sans-serif",
    lineHeight: '1.6',
    position: 'relative'
  },
  header: {
    color: '#FFB800',
    fontSize: '2.5rem',
    marginBottom: '2rem',
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  lastUpdated: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  section: {
    marginBottom: '2rem'
  },
  sectionTitle: {
    color: '#FFB800',
    fontSize: '1.5rem',
    marginBottom: '1rem',
    fontWeight: '600',
    fontFamily: "'Chakra Petch', sans-serif"
  },
  paragraph: {
    marginBottom: '1rem',
    fontSize: '1rem',
    color: '#B8C3E6',
    maxWidth: '750px',
    wordWrap: 'break-word',
    hyphens: 'auto'
  },
  list: {
    marginLeft: '2rem',
    marginBottom: '1rem'
  },
  listItem: {
    marginBottom: '0.5rem',
    wordWrap: 'break-word'
  },
  link: {
    color: '#FFB800',
    textDecoration: 'none'
  }
};

function TermsOfService() {
  return (
    <div className="tos-container">
      <style>
        {`
          .tos-container {
            max-width: 850px;
            margin: 120px auto 40px;
            padding: 2rem;
            color: #B8C3E6;
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            position: relative;
          }

          @media (min-width: 1601px) {
            .tos-container {
              margin-left: 350px;
            }
          }

          @media (max-width: 1600px) {
            .tos-container {
              margin-left: 250px;
            }
          }

          @media (max-width: 1200px) {
            .tos-container {
              margin-left: 150px;
            }
          }

          @media (max-width: 768px) {
            .tos-container {
              margin: 80px 20px;
              padding: 1rem;
              width: calc(100% - 40px);
            }

            .tos-container h1 {
              font-size: 1.8rem;
              margin-bottom: 1.5rem;
            }

            .tos-container h2 {
              font-size: 1.2rem;
            }

            .tos-container p,
            .tos-container li {
              font-size: 0.9rem;
            }
          }
        `}
      </style>

      <h1 style={styles.header}>Terms of Service</h1>
      <p style={styles.lastUpdated}>Last Updated: 29/12/2024 17:20 GMT+2</p>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Getting Started</h2>
        <p style={styles.paragraph}>
          Thank you for visiting BloxRoll! These Terms of Service ("Terms") apply to your use of our website and all related features ("Service"). By accessing or using the Service, you agree to follow these Terms. Please take the time to read them carefully.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Age Restrictions</h2>
        <p style={styles.paragraph}>
          You must be 18 years or older to use BloxRoll. By using the Service, you confirm that you meet this requirement. If you are under 18, you are not permitted to use the Service and must stop immediately.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Creating an Account</h2>
        <p style={styles.paragraph}>
          To use the Service, you need to register for an account ("Account"). You must provide accurate and up-to-date information during registration. It's your responsibility to keep your Account details current. You are also responsible for protecting your login credentials and for any actions taken under your Account. BloxRoll is not responsible for unauthorized access to your Account.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Virtual Currency Usage</h2>
        <p style={styles.paragraph}>
          BloxRoll is an entertainment platform that uses a virtual currency ("Virtual Currency") for in-game activities. This Virtual Currency has no real-world value and cannot be bought, sold, or exchanged for real money or other assets. It is intended solely for use within the Service.
        </p>
        <p style={styles.paragraph}>
          By using the Service, you agree that all Virtual Currency, virtual items, and rewards are purely fictional and hold no monetary value. They are designed for entertainment purposes only and cannot be converted into real-world currency, goods, or services. Any attempt to trade, sell, or exchange these items for real-world value is strictly prohibited and may result in account suspension or termination.
        </p>
        <p style={styles.paragraph}>
          BloxRoll does not support or facilitate real-money gambling. All activities on the platform are simulated and meant for recreational use. While some games may involve chance, the outcomes have no real-world financial implications. These activities are similar to arcade games and are not connected to actual gambling.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Gameplay Guidelines</h2>
        <p style={styles.paragraph}>
          BloxRoll offers entertainment services inspired by popular fandoms, featuring virtual content, items, and currency related to platforms like Roblox. By participating in games, you acknowledge that they are for entertainment only and do not involve real-world rewards. You must follow all game rules and guidelines. Violations may result in penalties, including account suspension or termination.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>6. Deposits and Withdrawals</h2>
        <p style={styles.paragraph}>
          Deposits and withdrawals of Virtual Currency and items depend on Service availability. BloxRoll is not responsible for delays, interruptions, or unavailability of these features. You acknowledge that BloxRoll is not liable for any issues related to deposits or withdrawals caused by technical problems, user errors, or other unforeseen circumstances.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>7. Refund Policy</h2>
        <p style={styles.paragraph}>
          If you encounter issues with missing items, you must contact our support team within 72 hours and provide evidence, such as uncut video proof. Failure to meet these requirements may result in the inability to assist you. Once an item is used in a bet, it becomes ineligible for refunds. Note that our support team may not always resolve issues, and we are not responsible for losses on the platform.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>8. Account Moderation</h2>
        <p style={styles.paragraph}>
          BloxRoll reserves the right to suspend or blacklist accounts that violate platform rules, engage in abusive behavior, or attempt to exploit the system. Such actions may be taken without prior warning. Moderators have the authority to issue warnings, suspend accounts, or ban users to maintain a fair and enjoyable environment.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>9. Liability Limitations</h2>
        <p style={styles.paragraph}>
          Your use of the Service is at your own risk. To the fullest extent permitted by law, BloxRoll is not liable for any direct, indirect, incidental, or consequential damages arising from your use of the Service. This includes technical issues, interruptions, or losses related to Virtual Currency. BloxRoll is also not responsible for errors or inaccuracies in content, including item descriptions or prices.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>10. Prohibited Activities</h2>
        <p style={styles.paragraph}>
          You must not engage in activities that harm the Service's integrity, such as using bots, automation, or third-party software to manipulate the platform. Cheating, hacking, or dishonest behavior will result in immediate account termination and may be reported to authorities.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>11. Unforeseen Events</h2>
        <p style={styles.paragraph}>
          BloxRoll is not liable for disruptions or delays caused by events beyond our control, such as system failures. In such cases, we will make reasonable efforts to restore the Service as soon as possible.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>12. Giveaway System</h2>
        <p style={styles.paragraph}>
          BloxRoll offers a transparent giveaway system where users can create and participate in giveaways. Only users who have played a coinflip game in the last 12 hours are eligible to join. All items must be obtained legally and cannot be stolen, duplicated, or fraudulently acquired. The system operates tax-free and ensures fairness.
        </p>
        <p style={styles.paragraph}>
          <span style={styles.emphasis}>Important:</span> Virtual items have no real-world value and cannot be sold, traded, or exchanged for real currency. Attempting to monetize items or engage in fraudulent activities is prohibited and may result in account suspension.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>13. Account Termination</h2>
        <p style={styles.paragraph}>
          BloxRoll may terminate or suspend your Account at any time, with or without cause, and without notice. Termination may occur if you violate these Terms, engage in abusive behavior, or attempt to exploit the platform. BloxRoll is not responsible for bans on other platforms, such as Roblox. Upon termination, you forfeit all rights to virtual content, items, or currency.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>14. Bot Account Policy</h2>
        <p style={styles.paragraph}>
          If a bot account is banned, all related items for the affected game type will be removed. Refunds will not be provided in such cases. This policy ensures the integrity and fairness of the platform.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>15. Intellectual Property</h2>
        <p style={styles.paragraph}>
          All virtual content, items, and assets on BloxRoll are owned by BloxRoll or their respective owners and are protected by intellectual property laws. You may not reproduce, distribute, or display any content without explicit permission.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>16. Service Downtime</h2>
        <p style={styles.paragraph}>
          BloxRoll may experience downtime due to maintenance or technical issues. We are not liable for any losses or damages resulting from these disruptions.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>17. Changes to Terms</h2>
        <p style={styles.paragraph}>
          BloxRoll may update these Terms at any time without notice. Your continued use of the Service after changes are posted constitutes acceptance of the new Terms. We will notify users of significant changes through the website or other means.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>18. Severability</h2>
        <p style={styles.paragraph}>
          If any part of these Terms is found to be unenforceable, the remaining provisions will remain in effect.
        </p>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>19. Contact Us</h2>
        <p style={styles.paragraph}>
          For questions or concerns about these Terms, please contact us at:
        </p>
        <ul style={styles.list}>
          <li style={styles.listItem}>
            Discord: <a href="https://discord.gg/KFAkgwkh" style={styles.link}>discord.gg/KFAkgwkh</a>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TermsOfService; 